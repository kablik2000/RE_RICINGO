"""The Studio's statistics page: content, students, invitations and monthly activity."""

from datetime import UTC, datetime, timedelta
from typing import Any

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, select, update
from sqlalchemy.orm import Session

from rici_api import statistics
from rici_api.auth import Teacher
from rici_api.models import AuthSession, Invitation, User

from .conftest import RecordingMailer, create_teacher, import_demo, sign_in
from .test_student_auth import accept, invited_code
from .test_students import invite


def get_statistics(client: FlaskClient) -> dict[str, Any]:
    response = client.get("/api/v1/studio/statistics")
    assert response.status_code == 200
    body: dict[str, Any] = response.get_json()
    return body


def test_an_empty_studio_has_zeros_and_twelve_months(client: FlaskClient) -> None:
    body = get_statistics(client)

    assert body["lessons"]["byStatus"] == {
        "draft": 0,
        "published": 0,
        "changed": 0,
        "unpublished": 0,
    }
    assert set(body["lessons"]["byLevel"]) == {"A1", "A2", "B1", "B2", "C1", "C2"}
    assert body["students"] == {
        "total": 0,
        "minors": 0,
        "activeLast7Days": 0,
        "activeLast30Days": 0,
    }
    assert body["invitations"] == {"pending": 0, "expired": 0, "accepted": 0, "revoked": 0}
    assert body["recommendations"] == 0
    months = body["months"]
    assert len(months) == statistics.MONTHS
    assert months[-1]["month"] == datetime.now(UTC).strftime("%Y-%m")
    assert months == sorted(months, key=lambda m: m["month"])


def test_lessons_students_and_invitations_are_counted(
    client: FlaskClient, studio_app: Flask, engine: Engine, mailbox: RecordingMailer
) -> None:
    import_demo(engine, visibility="public")
    assert (
        client.post(
            "/api/v1/studio/lessons",
            json={"titleItalian": "Al mercato", "titleCzech": "Na trhu", "level": "B1"},
        ).status_code
        == 201
    )
    # One student accepts and uses the app, one invitation stays open, one is revoked.
    assert accept(studio_app.test_client(), invited_code(client, mailbox)).status_code == 200
    assert invite(client, email="jan@example.test", displayName="Jan").status_code == 201
    revoked = invite(client, email="eva@example.test", displayName="Eva").get_json()["invitation"]
    assert client.delete(f"/api/v1/studio/invitations/{revoked['id']}").status_code == 204

    body = get_statistics(client)

    assert body["lessons"]["byStatus"]["published"] == 1
    assert body["lessons"]["byStatus"]["draft"] == 1
    assert body["lessons"]["byLevel"]["A1"] == 1
    assert body["lessons"]["byLevel"]["B1"] == 1
    assert body["lessons"]["public"] == 1
    assert body["lessons"]["publishedLexemes"] > 0
    assert body["students"]["total"] == 1
    assert body["students"]["activeLast7Days"] == 1
    assert body["invitations"] == {"pending": 1, "expired": 0, "accepted": 1, "revoked": 1}
    this_month = body["months"][-1]
    assert this_month["studentsJoined"] == 1
    assert this_month["lessonsPublished"] == 1


def test_students_who_did_not_use_the_app_lately_are_not_active(
    client: FlaskClient, studio_app: Flask, engine: Engine, mailbox: RecordingMailer
) -> None:
    assert accept(studio_app.test_client(), invited_code(client, mailbox)).status_code == 200
    with Session(engine) as session, session.begin():
        # The student's sessions only: the teacher's own would end as idle.
        session.execute(
            update(AuthSession)
            .where(AuthSession.user_id.in_(select(User.id).where(User.role == "student")))
            .values(last_seen_at=datetime.now(UTC) - timedelta(days=10))
        )

    body = get_statistics(client)

    assert body["students"]["total"] == 1
    assert body["students"]["activeLast7Days"] == 0
    assert body["students"]["activeLast30Days"] == 1


def test_expired_invitations_are_counted_apart(
    client: FlaskClient, engine: Engine, mailbox: RecordingMailer
) -> None:
    assert invite(client).status_code == 201
    with Session(engine) as session, session.begin():
        session.execute(update(Invitation).values(expires_at=datetime.now(UTC) - timedelta(days=1)))

    assert get_statistics(client)["invitations"]["expired"] == 1


def test_other_teachers_see_only_their_own_students(
    client: FlaskClient, studio_app: Flask, engine: Engine, mailbox: RecordingMailer
) -> None:
    assert accept(studio_app.test_client(), invited_code(client, mailbox)).status_code == 200
    colleague: Teacher = create_teacher(engine, email="kolega@example.test")
    other = studio_app.test_client()
    sign_in(other, colleague.email)

    body = get_statistics(other)

    assert body["students"]["total"] == 0
    assert body["invitations"]["accepted"] == 0


def test_statistics_need_a_session(anonymous_client: FlaskClient) -> None:
    assert anonymous_client.get("/api/v1/studio/statistics").status_code == 401
