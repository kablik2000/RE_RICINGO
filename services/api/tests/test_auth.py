from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, select, text, update
from sqlalchemy.orm import Session

from rici_api import auth
from rici_api.app import create_app
from rici_api.config import Settings
from rici_api.models import AuthSession, LoginAttempt, User

from .conftest import (
    TEACHER_EMAIL,
    TEACHER_PASSWORD,
    TEST_DATABASE_URL,
    RecordingMailer,
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


def test_behind_a_trusted_proxy_the_address_is_the_one_it_appended(
    engine: Engine, mailbox: RecordingMailer
) -> None:
    app = create_app(
        Settings(app_env="test", database_url=TEST_DATABASE_URL, trusted_proxy_hops=1),
        engine=engine,
        mailer=mailbox,
    )
    client = app.test_client()
    # A client-sent entry ("1.2.3.4") comes first; the proxy appends the real peer last.
    client.post(
        "/api/v1/auth/login",
        json={"email": "nekdo@example.test", "password": "nejake-dlouhe-heslo-1"},
        headers={"X-Forwarded-For": "1.2.3.4, 203.0.113.7"},
    )
    # Without the header (the Studio over the private network) the peer address stays.
    client.post(
        "/api/v1/auth/login",
        json={"email": "nekdo@example.test", "password": "nejake-dlouhe-heslo-1"},
    )

    with Session(engine) as session:
        addresses = session.scalars(select(LoginAttempt.address).order_by(LoginAttempt.created_at))
        assert list(addresses) == ["203.0.113.7", "127.0.0.1"]


# --- Changing one's own password (Studio account page) ---

NEW_PASSWORD = "nove-testovaci-heslo-lektorky"


def change_password(client: FlaskClient, current: str, new: str) -> Any:
    return client.post(
        "/api/v1/auth/password", json={"currentPassword": current, "newPassword": new}
    )


def test_changing_the_password_keeps_this_session_and_ends_the_others(
    studio_app: Flask, teacher: auth.Teacher
) -> None:
    this_device = studio_app.test_client()
    other_device = studio_app.test_client()
    sign_in(this_device)
    sign_in(other_device)

    response = change_password(this_device, TEACHER_PASSWORD, NEW_PASSWORD)

    assert response.status_code == 204
    assert this_device.get("/api/v1/auth/me").status_code == 200
    assert other_device.get("/api/v1/auth/me").status_code == 401
    anonymous = studio_app.test_client()
    assert login(anonymous, TEACHER_EMAIL, TEACHER_PASSWORD).status_code == 401
    assert login(anonymous, TEACHER_EMAIL, NEW_PASSWORD).status_code == 200


def test_a_wrong_current_password_changes_nothing_and_counts_as_a_failed_sign_in(
    client: FlaskClient, engine: Engine
) -> None:
    response = change_password(client, "uplne-spatne-heslo-123", NEW_PASSWORD)

    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "wrong_password"
    assert client.get("/api/v1/auth/me").status_code == 200
    assert login(client, TEACHER_EMAIL, TEACHER_PASSWORD).status_code == 200
    with Session(engine) as session:
        failures = session.scalars(
            select(LoginAttempt).where(LoginAttempt.succeeded.is_(False))
        ).all()
    assert len(failures) == 1


@pytest.mark.parametrize(
    ("new", "code"),
    [
        ("kratke-heslo", "password_too_short"),
        ("x" * (auth.PASSWORD_MAX_LENGTH + 1), "password_too_long"),
        (TEACHER_EMAIL, "password_is_email"),
        ("abcabcabcabcabcabc", "password_too_repetitive"),
    ],
)
def test_a_weak_new_password_is_refused_with_its_reason(
    client: FlaskClient, new: str, code: str
) -> None:
    response = change_password(client, TEACHER_PASSWORD, new)

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == code
    assert login(client, TEACHER_EMAIL, TEACHER_PASSWORD).status_code == 200


def test_repeated_wrong_current_passwords_are_throttled(client: FlaskClient) -> None:
    for _ in range(auth.MAX_FAILURES_PER_EMAIL):
        assert change_password(client, "spatne-heslo-dlouhe-1", NEW_PASSWORD).status_code == 403

    blocked = change_password(client, TEACHER_PASSWORD, NEW_PASSWORD)

    assert blocked.status_code == 429
    assert blocked.get_json()["error"]["code"] == "too_many_attempts"


@pytest.mark.parametrize(
    "body",
    [None, {}, {"currentPassword": "", "newPassword": NEW_PASSWORD}, {"currentPassword": 1}],
)
def test_changing_the_password_needs_both_fields(client: FlaskClient, body: Any) -> None:
    assert client.post("/api/v1/auth/password", json=body).status_code == 422


def test_changing_the_password_needs_a_session(
    anonymous_client: FlaskClient, teacher: auth.Teacher
) -> None:
    response = change_password(anonymous_client, TEACHER_PASSWORD, NEW_PASSWORD)
    assert response.status_code == 401
    assert login(anonymous_client, TEACHER_EMAIL, TEACHER_PASSWORD).status_code == 200
