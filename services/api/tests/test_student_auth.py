from datetime import UTC, datetime, timedelta
from typing import Any

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, select, update
from sqlalchemy.orm import Session

from rici_api import student_auth
from rici_api.models import AuthSession, Invitation, User

from .conftest import RecordingMailer, create_teacher, sign_in
from .test_students import invite, sent_code

STUDENT_PASSWORD = "heslo-studenta-1"
STUDENT_EMAIL = "marie@example.test"


def accept(
    client: FlaskClient, code: str, password: str = STUDENT_PASSWORD, device: str = "Pixel"
) -> Any:
    return client.post(
        "/api/v1/student/invitations/accept",
        json={"code": code, "password": password, "deviceName": device},
    )


def student_login(client: FlaskClient, device: str, **extra: object) -> Any:
    return client.post(
        "/api/v1/student/login",
        json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD, "deviceName": device, **extra},
    )


def bearer(response: Any) -> dict[str, str]:
    return {"Authorization": f"Bearer {response.get_json()['token']}"}


def invited_code(client: FlaskClient, mailbox: RecordingMailer, **overrides: object) -> str:
    assert invite(client, **overrides).status_code == 201
    return sent_code(mailbox)


def test_a_code_creates_the_account_and_signs_the_device_in(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer, engine: Engine
) -> None:
    code = invited_code(client, mailbox)
    app = studio_app.test_client()

    response = accept(app, code.lower().replace("-", ""))

    assert response.status_code == 200
    assert response.get_json()["student"]["email"] == STUDENT_EMAIL
    me = app.get("/api/v1/student/me", headers=bearer(response)).get_json()
    assert me["student"]["displayName"] == "Marie Nováková"
    assert [(d["name"], d["current"]) for d in me["devices"]] == [("Pixel", True)]
    [listed] = client.get("/api/v1/studio/students").get_json()["students"]
    assert (listed["email"], listed["deviceCount"]) == (STUDENT_EMAIL, 1)
    assert client.get("/api/v1/studio/students").get_json()["invitations"] == []
    with Session(engine) as session:
        user = session.scalars(select(User).where(User.email == STUDENT_EMAIL)).one()
    assert user.role == "student" and user.password_hash.startswith("$argon2id$")


def test_a_code_works_only_once(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer
) -> None:
    code = invited_code(client, mailbox)
    app = studio_app.test_client()
    assert accept(app, code).status_code == 200

    again = accept(app, code, password="jine-heslo-kamarada")

    assert again.status_code == 400
    assert again.get_json()["error"]["code"] == "invalid_invitation"


def test_revoked_expired_and_unknown_codes_are_refused_alike(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer, engine: Engine
) -> None:
    app = studio_app.test_client()
    revoked = invite(client).get_json()["invitation"]
    revoked_code = sent_code(mailbox)
    client.delete(f"/api/v1/studio/invitations/{revoked['id']}")
    expired_code = invited_code(client, mailbox, email="petr@example.test")
    with Session(engine) as session, session.begin():
        session.execute(
            update(Invitation)
            .where(Invitation.email == "petr@example.test")
            .values(expires_at=datetime.now(UTC) - timedelta(minutes=1))
        )

    answers = [accept(app, code) for code in (revoked_code, expired_code, "ABCD-EFGH-JKMN")]

    assert {answer.status_code for answer in answers} == {400}
    assert len({str(answer.get_json()) for answer in answers}) == 1


def test_guessing_codes_is_throttled_per_address(studio_app: Flask) -> None:
    app = studio_app.test_client()
    for _ in range(student_auth.MAX_CODE_FAILURES_PER_ADDRESS):
        assert accept(app, "ABCD-EFGH-JKMN").status_code == 400

    blocked = accept(app, "ABCD-EFGH-JKMN")

    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0


def test_a_weak_password_keeps_the_code_usable(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer
) -> None:
    code = invited_code(client, mailbox)
    app = studio_app.test_client()

    weak = accept(app, code, password="kratke")

    assert (weak.status_code, weak.get_json()["error"]["code"]) == (422, "weak_password")
    assert accept(app, code).status_code == 200


def test_at_most_three_devices_and_the_fourth_can_replace_one(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer
) -> None:
    app = studio_app.test_client()
    first = accept(app, invited_code(client, mailbox), device="Telefon")
    assert student_login(app, "Tablet").status_code == 200
    assert student_login(app, "Notebook").status_code == 200

    refused = student_login(app, "Telefon kamarádky")

    assert refused.status_code == 409
    devices = refused.get_json()["error"]["devices"]
    assert sorted(device["name"] for device in devices) == ["Notebook", "Tablet", "Telefon"]
    replaced = next(device for device in devices if device["name"] == "Telefon")
    replacing = student_login(app, "Nový telefon", replaceDeviceId=replaced["id"])
    assert replacing.status_code == 200
    assert app.get("/api/v1/student/me", headers=bearer(first)).status_code == 401


def test_a_wrong_password_never_reveals_the_devices(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer
) -> None:
    app = studio_app.test_client()
    accept(app, invited_code(client, mailbox))

    response = app.post(
        "/api/v1/student/login",
        json={"email": STUDENT_EMAIL, "password": "spatne-heslo-1234", "deviceName": "X"},
    )

    assert response.status_code == 401
    assert "devices" not in response.get_json()["error"]


def test_a_student_removes_a_device_and_signs_out(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer
) -> None:
    app = studio_app.test_client()
    phone = accept(app, invited_code(client, mailbox), device="Telefon")
    tablet = student_login(app, "Tablet")
    devices = app.get("/api/v1/student/me", headers=bearer(phone)).get_json()["devices"]
    tablet_id = next(device["id"] for device in devices if device["name"] == "Tablet")

    assert (
        app.delete(f"/api/v1/student/devices/{tablet_id}", headers=bearer(phone)).status_code == 204
    )
    assert app.get("/api/v1/student/me", headers=bearer(tablet)).status_code == 401

    assert app.post("/api/v1/student/logout", headers=bearer(phone)).status_code == 204
    assert app.get("/api/v1/student/me", headers=bearer(phone)).status_code == 401


def test_the_teacher_signs_a_student_out_everywhere(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer
) -> None:
    app = studio_app.test_client()
    phone = accept(app, invited_code(client, mailbox))
    [student] = client.get("/api/v1/studio/students").get_json()["students"]

    assert client.delete(f"/api/v1/studio/students/{student['id']}/sessions").status_code == 204

    assert app.get("/api/v1/student/me", headers=bearer(phone)).status_code == 401
    assert client.get("/api/v1/studio/students").get_json()["students"][0]["deviceCount"] == 0
    assert student_login(app, "Telefon").status_code == 200


def test_tokens_of_one_role_do_not_open_the_other(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer
) -> None:
    app = studio_app.test_client()
    student = accept(app, invited_code(client, mailbox))
    teacher_token = client.environ_base["HTTP_AUTHORIZATION"]

    assert app.get("/api/v1/studio/lessons", headers=bearer(student)).status_code == 401
    assert (
        app.get("/api/v1/student/me", headers={"Authorization": teacher_token}).status_code == 401
    )


def test_an_existing_student_joins_another_teacher_only_with_their_password(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer, engine: Engine
) -> None:
    app = studio_app.test_client()
    accept(app, invited_code(client, mailbox))
    create_teacher(engine, email="kolegyne@example.test")
    colleague = studio_app.test_client()
    sign_in(colleague, email="kolegyne@example.test")
    code = invited_code(colleague, mailbox)

    taken_over = accept(app, code, password="heslo-cizi-osoby")
    assert (taken_over.status_code, taken_over.get_json()["error"]["code"]) == (
        409,
        "existing_account",
    )

    assert accept(app, code).status_code == 200
    assert len(colleague.get("/api/v1/studio/students").get_json()["students"]) == 1


def test_a_removed_student_comes_back_with_a_new_invitation(
    client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer, engine: Engine
) -> None:
    app = studio_app.test_client()
    accept(app, invited_code(client, mailbox))
    [student] = client.get("/api/v1/studio/students").get_json()["students"]
    client.delete(f"/api/v1/studio/students/{student['id']}")
    assert student_login(app, "Telefon").status_code == 401

    response = accept(app, invited_code(client, mailbox), password="nove-heslo-marie")

    assert response.status_code == 200
    with Session(engine) as session:
        assert session.scalars(select(AuthSession)).all() != []


def test_student_endpoints_need_a_session(studio_app: Flask) -> None:
    app = studio_app.test_client()
    assert app.get("/api/v1/student/me").status_code == 401
    assert app.get("/api/v1/student/me", headers={"Authorization": "Bearer nic"}).status_code == 401
    assert (
        app.delete("/api/v1/student/devices/00000000-0000-0000-0000-000000000000").status_code
        == 401
    )
