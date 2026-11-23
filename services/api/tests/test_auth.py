from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, select, text, update
from sqlalchemy.orm import Session

from rici_api import auth
from rici_api.models import AuthSession, User

from .conftest import (
    TEACHER_EMAIL,
    TEACHER_PASSWORD,
    create_teacher,
    import_demo,
    sign_in,
)


def login(client: FlaskClient, email: str, password: str) -> Any:
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_signing_in_opens_a_session_and_signing_out_ends_it(
    anonymous_client: FlaskClient, teacher: auth.Teacher
) -> None:
    response = login(anonymous_client, " Lektorka@Example.TEST ", TEACHER_PASSWORD)

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    body = response.get_json()
    assert body["teacher"]["email"] == TEACHER_EMAIL
    headers = {"Authorization": f"Bearer {body['token']}"}
    assert anonymous_client.get("/api/v1/auth/me", headers=headers).status_code == 200
    assert anonymous_client.get("/api/v1/studio/lessons", headers=headers).status_code == 200

    assert anonymous_client.post("/api/v1/auth/logout", headers=headers).status_code == 204

    assert anonymous_client.get("/api/v1/auth/me", headers=headers).status_code == 401
    assert anonymous_client.get("/api/v1/studio/lessons", headers=headers).status_code == 401


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer not-a-session"},
        {"Authorization": "Basic bGVrdG9ya2E6aGVzbG8="},
        {"Authorization": "Bearer " + "x" * 500},
    ],
)
def test_every_studio_endpoint_needs_a_session(
    anonymous_client: FlaskClient, engine: Engine, headers: dict[str, str]
) -> None:
    import_demo(engine)
    requests = [
        ("GET", "/api/v1/studio/overview"),
        ("GET", "/api/v1/studio/lessons"),
        ("POST", "/api/v1/studio/lessons"),
        ("GET", "/api/v1/studio/lessons/al-bar"),
        ("PUT", "/api/v1/studio/lessons/al-bar"),
        ("POST", "/api/v1/studio/lessons/al-bar/publish"),
        ("POST", "/api/v1/studio/lessons/al-bar/unpublish"),
        ("DELETE", "/api/v1/studio/lessons/al-bar"),
    ]
    for method, path in requests:
        response = anonymous_client.open(path, method=method, headers=headers, json={})
        assert response.status_code == 401, (method, path)


def test_a_wrong_password_and_an_unknown_account_look_the_same(
    anonymous_client: FlaskClient, teacher: auth.Teacher
) -> None:
    wrong_password = login(anonymous_client, TEACHER_EMAIL, "uplne-spatne-heslo-123")
    unknown_account = login(anonymous_client, "nikdo@example.test", TEACHER_PASSWORD)

    assert wrong_password.status_code == unknown_account.status_code == 401
    assert wrong_password.get_json() == unknown_account.get_json()


def test_repeated_failures_block_the_email_even_with_the_right_password(
    anonymous_client: FlaskClient, teacher: auth.Teacher
) -> None:
    for _ in range(auth.MAX_FAILURES_PER_EMAIL):
        assert login(anonymous_client, TEACHER_EMAIL, "spatne-heslo-dlouhe-1").status_code == 401

    blocked = login(anonymous_client, TEACHER_EMAIL, TEACHER_PASSWORD)

    assert blocked.status_code == 429
    assert 0 < int(blocked.headers["Retry-After"]) <= 15 * 60
    assert blocked.get_json()["error"]["code"] == "too_many_attempts"


def test_unknown_emails_are_blocked_the_same_way(anonymous_client: FlaskClient) -> None:
    for _ in range(auth.MAX_FAILURES_PER_EMAIL):
        login(anonymous_client, "nikdo@example.test", "nejake-dlouhe-heslo-1")

    assert login(anonymous_client, "nikdo@example.test", "nejake-dlouhe-heslo-1").status_code == 429


def test_the_block_ends_after_the_window(
    anonymous_client: FlaskClient, teacher: auth.Teacher, engine: Engine
) -> None:
    for _ in range(auth.MAX_FAILURES_PER_EMAIL):
        login(anonymous_client, TEACHER_EMAIL, "spatne-heslo-dlouhe-1")
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE login_attempts SET created_at = created_at - interval '16 minutes'")
        )

    assert login(anonymous_client, TEACHER_EMAIL, TEACHER_PASSWORD).status_code == 200


def test_one_address_is_blocked_after_many_failures(
    anonymous_client: FlaskClient, teacher: auth.Teacher
) -> None:
    for number in range(auth.MAX_FAILURES_PER_ADDRESS):
        login(anonymous_client, f"zkouska{number}@example.test", "nejake-dlouhe-heslo-1")

    assert login(anonymous_client, TEACHER_EMAIL, TEACHER_PASSWORD).status_code == 429


def test_sessions_end_after_idle_time_and_after_their_lifetime(
    anonymous_client: FlaskClient, teacher: auth.Teacher, engine: Engine
) -> None:
    idle = sign_in(anonymous_client)
    with Session(engine) as session, session.begin():
        session.execute(
            update(AuthSession).values(
                last_seen_at=datetime.now(UTC) - auth.SESSION_IDLE_TIMEOUT - timedelta(minutes=1)
            )
        )
    assert anonymous_client.get("/api/v1/auth/me").status_code == 401
    with Session(engine) as session:
        assert session.scalars(select(AuthSession)).all() == []

    sign_in(anonymous_client)
    with Session(engine) as session, session.begin():
        session.execute(update(AuthSession).values(expires_at=datetime.now(UTC)))
    assert anonymous_client.get("/api/v1/auth/me").status_code == 401
    assert idle not in anonymous_client.environ_base["HTTP_AUTHORIZATION"]


def test_only_a_hash_of_the_token_is_stored(
    anonymous_client: FlaskClient, teacher: auth.Teacher, engine: Engine
) -> None:
    token = sign_in(anonymous_client)

    with Session(engine) as session:
        stored = session.scalars(select(AuthSession.token_hash)).one()
        password_hash = session.scalars(select(User.password_hash)).one()
    assert token not in stored and len(stored) == 64
    assert password_hash.startswith("$argon2id$")
    assert TEACHER_PASSWORD not in password_hash


def test_a_new_password_or_a_disabled_account_ends_all_sessions(
    anonymous_client: FlaskClient, teacher: auth.Teacher, engine: Engine
) -> None:
    sign_in(anonymous_client)
    with Session(engine) as session, session.begin():
        auth.set_password(session, TEACHER_EMAIL, "nove-testovaci-heslo-lektorky")
    assert anonymous_client.get("/api/v1/auth/me").status_code == 401

    response = login(anonymous_client, TEACHER_EMAIL, "nove-testovaci-heslo-lektorky")
    headers = {"Authorization": f"Bearer {response.get_json()['token']}"}
    with Session(engine) as session, session.begin():
        auth.set_active(session, TEACHER_EMAIL, active=False)
    assert anonymous_client.get("/api/v1/auth/me", headers=headers).status_code == 401
    assert (
        login(anonymous_client, TEACHER_EMAIL, "nove-testovaci-heslo-lektorky").status_code == 401
    )


def test_teachers_see_only_their_organizations_lessons(
    studio_app: Flask, client: FlaskClient, engine: Engine
) -> None:
    import_demo(engine, organization="Jina skola")
    create_teacher(engine, email="jina@example.test", organization="Jina skola")
    other = studio_app.test_client()
    sign_in(other, email="jina@example.test")

    assert client.get("/api/v1/studio/lessons").get_json()["lessons"] == []
    for method, path in [
        ("GET", "/api/v1/studio/lessons/al-bar"),
        ("POST", "/api/v1/studio/lessons/al-bar/unpublish"),
        ("DELETE", "/api/v1/studio/lessons/al-bar"),
    ]:
        assert client.open(path, method=method).status_code == 404, (method, path)
    assert [
        lesson["id"] for lesson in other.get("/api/v1/studio/lessons").get_json()["lessons"]
    ] == ["al-bar"]


@pytest.mark.parametrize(
    ("email", "password", "problem"),
    [
        ("lektorka@example.test", "kratke-heslo", "at least 15"),
        ("lektorka@example.test", "lektorka@example.test", "e-mail"),
        ("lektorka@example.test", "a" * 20, "too few"),
        ("not-an-email", "dostatecne-dlouhe-heslo", "e-mail"),
    ],
)
def test_weak_passwords_and_bad_emails_are_refused(
    engine: Engine, email: str, password: str, problem: str
) -> None:
    with (
        pytest.raises(auth.AccountError, match=problem),
        Session(engine) as session,
        session.begin(),
    ):
        auth.create_teacher(session, email, "Lektorka", "RICI", password)


def test_one_account_per_email(engine: Engine, teacher: auth.Teacher) -> None:
    with pytest.raises(auth.AccountError), Session(engine) as session, session.begin():
        auth.create_teacher(session, "LEKTORKA@example.test", "Jiná", "RICI", TEACHER_PASSWORD)
