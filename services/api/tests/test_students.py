import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, select, update
from sqlalchemy.orm import Session

from rici_api import auth, students
from rici_api.models import Invitation, TeacherStudent, User

from .conftest import RecordingMailer, create_teacher, sign_in

CODE = re.compile(r"[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}")


def invite(client: FlaskClient, **overrides: object) -> Any:
    body = {
        "email": "marie@example.test",
        "displayName": "Marie Nováková",
        "isMinor": False,
        "parentalConsent": False,
        **overrides,
    }
    return client.post("/api/v1/studio/invitations", json=body)


def sent_code(mailbox: RecordingMailer) -> str:
    match = CODE.search(mailbox.sent[-1].text)
    assert match is not None
    return match.group(0)


def add_student(
    engine: Engine, teacher: auth.Teacher, email: str = "petr@example.test"
) -> uuid.UUID:
    """A student account linked to `teacher` (accepting invitations comes in the app, step 3)."""
    with Session(engine) as session, session.begin():
        user = User(
            organization_id=teacher.organization_id,
            email=email,
            display_name="Petr",
            role="student",
            password_hash="not-used",
        )
        session.add(user)
        session.flush()
        session.add(TeacherStudent(teacher_id=teacher.id, student_id=user.id))
        return user.id


def test_an_invitation_is_emailed_with_a_one_time_code(
    client: FlaskClient, mailbox: RecordingMailer, engine: Engine
) -> None:
    response = invite(client, email=" Marie@Example.TEST ")

    assert response.status_code == 201
    invitation = response.get_json()["invitation"]
    assert (invitation["email"], invitation["status"]) == ("marie@example.test", "pending")
    [email] = mailbox.sent
    assert email.to == "marie@example.test"
    code = sent_code(mailbox)
    with Session(engine) as session:
        stored = session.scalars(select(Invitation)).one()
    assert stored.code_hash == students.code_hash(code)
    assert code.replace("-", "") not in stored.code_hash
    listed = client.get("/api/v1/studio/students").get_json()
    assert [item["email"] for item in listed["invitations"]] == ["marie@example.test"]
    assert listed["students"] == []


def test_codes_are_read_forgivingly() -> None:
    assert students.code_hash("abcd-efgh-jk01") == students.code_hash("ABCDEFGHJK01")
    assert students.code_hash("O1IL") == students.code_hash("0111")


def test_a_student_under_15_needs_the_parents_consent(
    client: FlaskClient, mailbox: RecordingMailer, engine: Engine
) -> None:
    refused = invite(client, isMinor=True, parentalConsent=False)
    assert refused.status_code == 422
    assert mailbox.sent == []

    accepted = invite(client, isMinor=True, parentalConsent=True)
    assert accepted.status_code == 201
    assert accepted.get_json()["invitation"]["isMinor"] is True
    with Session(engine) as session:
        assert session.scalars(select(Invitation.parental_consent_at)).one() is not None


@pytest.mark.parametrize(
    "overrides",
    [
        {"email": "not-an-email"},
        {"displayName": "  "},
        {"email": 5},
        {"isMinor": "yes"},
    ],
)
def test_invalid_invitations_are_refused(
    client: FlaskClient, mailbox: RecordingMailer, overrides: dict[str, object]
) -> None:
    assert invite(client, **overrides).status_code == 422
    assert mailbox.sent == []


def test_a_studio_account_cannot_be_invited(client: FlaskClient, teacher: auth.Teacher) -> None:
    assert invite(client, email=teacher.email).status_code == 422


def test_one_open_invitation_per_email_and_resending_replaces_the_code(
    client: FlaskClient, mailbox: RecordingMailer, engine: Engine
) -> None:
    first = invite(client).get_json()["invitation"]
    old_code = sent_code(mailbox)
    assert invite(client).status_code == 422

    resent = client.post(f"/api/v1/studio/invitations/{first['id']}/resend")

    assert resent.status_code == 200
    new_code = sent_code(mailbox)
    assert new_code != old_code
    with Session(engine) as session:
        stored = session.scalars(select(Invitation.code_hash)).one()
    assert stored == students.code_hash(new_code)


def test_expired_invitations_are_shown_and_can_be_sent_again(
    client: FlaskClient, engine: Engine
) -> None:
    invitation = invite(client).get_json()["invitation"]
    with Session(engine) as session, session.begin():
        session.execute(update(Invitation).values(expires_at=datetime.now(UTC) - timedelta(days=1)))

    [listed] = client.get("/api/v1/studio/students").get_json()["invitations"]
    assert listed["status"] == "expired"
    resent = client.post(f"/api/v1/studio/invitations/{invitation['id']}/resend")
    assert resent.get_json()["invitation"]["status"] == "pending"


def test_a_revoked_invitation_is_gone(client: FlaskClient) -> None:
    invitation = invite(client).get_json()["invitation"]

    assert client.delete(f"/api/v1/studio/invitations/{invitation['id']}").status_code == 204

    assert client.get("/api/v1/studio/students").get_json()["invitations"] == []
    assert client.post(f"/api/v1/studio/invitations/{invitation['id']}/resend").status_code == 404
    assert invite(client).status_code == 201


def test_nothing_is_saved_when_the_email_cannot_be_sent(
    client: FlaskClient, mailbox: RecordingMailer
) -> None:
    mailbox.fail = True

    response = invite(client)

    assert response.status_code == 502
    assert client.get("/api/v1/studio/students").get_json()["invitations"] == []


def test_teachers_see_only_their_own_invitations_and_students(
    studio_app: Flask, client: FlaskClient, teacher: auth.Teacher, engine: Engine
) -> None:
    invitation = invite(client).get_json()["invitation"]
    student_id = add_student(engine, teacher)
    create_teacher(engine, email="kolegyne@example.test")
    colleague = studio_app.test_client()
    sign_in(colleague, email="kolegyne@example.test")

    listed = colleague.get("/api/v1/studio/students").get_json()
    assert (listed["students"], listed["invitations"]) == ([], [])
    for method, path in [
        ("POST", f"/api/v1/studio/invitations/{invitation['id']}/resend"),
        ("DELETE", f"/api/v1/studio/invitations/{invitation['id']}"),
        ("DELETE", f"/api/v1/studio/students/{student_id}"),
    ]:
        assert colleague.open(path, method=method).status_code == 404, (method, path)
    assert len(client.get("/api/v1/studio/students").get_json()["students"]) == 1


def test_removing_the_last_teacher_disables_the_student(
    client: FlaskClient, teacher: auth.Teacher, engine: Engine
) -> None:
    student_id = add_student(engine, teacher)
    assert client.get("/api/v1/studio/overview").get_json()["students"] == 1

    assert client.delete(f"/api/v1/studio/students/{student_id}").status_code == 204

    assert client.get("/api/v1/studio/students").get_json()["students"] == []
    assert client.get("/api/v1/studio/overview").get_json()["students"] == 0
    with Session(engine) as session:
        assert session.get(User, student_id).is_active is False  # type: ignore[union-attr]


def test_a_student_with_another_teacher_stays_active(
    client: FlaskClient, teacher: auth.Teacher, engine: Engine
) -> None:
    student_id = add_student(engine, teacher)
    colleague = create_teacher(engine, email="kolegyne@example.test")
    with Session(engine) as session, session.begin():
        session.add(TeacherStudent(teacher_id=colleague.id, student_id=student_id))

    client.delete(f"/api/v1/studio/students/{student_id}")

    with Session(engine) as session:
        assert session.get(User, student_id).is_active is True  # type: ignore[union-attr]


def test_the_student_endpoints_need_a_session(anonymous_client: FlaskClient) -> None:
    some_id = uuid.uuid4()
    for method, path in [
        ("GET", "/api/v1/studio/students"),
        ("POST", "/api/v1/studio/invitations"),
        ("POST", f"/api/v1/studio/invitations/{some_id}/resend"),
        ("DELETE", f"/api/v1/studio/invitations/{some_id}"),
        ("DELETE", f"/api/v1/studio/students/{some_id}"),
    ]:
        assert anonymous_client.open(path, method=method, json={}).status_code == 401
