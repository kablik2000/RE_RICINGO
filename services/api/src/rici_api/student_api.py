"""Student endpoints for the app, `/api/v1/student/*` (ADR-0013).

The app sends the device's session token as `Authorization: Bearer <token>`. Errors carry a code
the app turns into a message: `invalid_invitation`, `weak_password`, `existing_account`,
`invalid_credentials`, `too_many_attempts`, `device_limit` (with the devices), `unauthorized`.
"""

import uuid
from collections.abc import Callable

from flask import Blueprint, Response, jsonify, request
from flask.typing import ResponseReturnValue
from sqlalchemy.orm import Session

from rici_api import auth, student_auth
from rici_api.auth_api import bearer_token

SessionFactory = Callable[[], Session]
MAX_FIELD_LENGTH = 512


def _error(code: str, message: str, status: int, **extra: object) -> tuple[Response, int]:
    return jsonify({"error": {"code": code, "message": message, **extra}}), status


def _device_json(device: student_auth.Device) -> dict[str, object]:
    return {
        "id": str(device.id),
        "name": device.name,
        "signedInAt": device.signed_in_at.isoformat(),
        "lastSeenAt": device.last_seen_at.isoformat(),
        "current": device.current,
    }


def _signed_in_json(signed_in: student_auth.StudentSignedIn) -> ResponseReturnValue:
    response = jsonify(
        {
            "token": signed_in.token,
            "expiresAt": signed_in.expires_at.isoformat(),
            "student": {
                "id": str(signed_in.student.id),
                "email": signed_in.student.email,
                "displayName": signed_in.student.display_name,
            },
        }
    )
    response.headers["Cache-Control"] = "no-store"
    return response


def _text(body: dict[str, object], name: str) -> str | None:
    value = body.get(name)
    return value[:MAX_FIELD_LENGTH] if isinstance(value, str) and value else None


def _optional_uuid(value: object) -> uuid.UUID | None:
    if not isinstance(value, str):
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


def student_blueprint(session_factory: SessionFactory) -> Blueprint:
    blueprint = Blueprint("student", __name__)

    @blueprint.errorhandler(auth.TooManyAttemptsError)
    def throttled(error: auth.TooManyAttemptsError) -> ResponseReturnValue:
        response, status = _error(
            "too_many_attempts",
            "Too many failed attempts.",
            429,
            retryAfter=error.retry_after_seconds,
        )
        response.headers["Retry-After"] = str(error.retry_after_seconds)
        return response, status

    @blueprint.post("/invitations/accept")
    def accept_invitation() -> ResponseReturnValue:
        body = request.get_json(silent=True)
        body = body if isinstance(body, dict) else {}
        code, password = _text(body, "code"), _text(body, "password")
        if code is None or password is None:
            return _error("validation", 'Expected {"code", "password", "deviceName"}.', 422)
        failure: tuple[Response, int] | None = None
        try:
            with session_factory() as session, session.begin():
                try:
                    signed_in = student_auth.accept_invitation(
                        session,
                        code,
                        password,
                        request.remote_addr or "",
                        _text(body, "deviceName"),
                    )
                except student_auth.InvalidInvitationError:
                    # Committed: the failed attempt counts towards the address limit.
                    failure = _error("invalid_invitation", "Unknown or used invitation code.", 400)
                except student_auth.ExistingAccountError:
                    # Committed: the wrong password counts like a failed sign-in.
                    failure = _error(
                        "existing_account", "An account exists; use its current password.", 409
                    )
        except student_auth.WeakPasswordError as error:
            return _error("weak_password", str(error), 422)
        except student_auth.DeviceLimitError as error:
            return _error(
                "device_limit",
                "Signed in on too many devices.",
                409,
                devices=[_device_json(device) for device in error.devices],
            )
        return failure if failure is not None else _signed_in_json(signed_in)

    @blueprint.post("/login")
    def login() -> ResponseReturnValue:
        body = request.get_json(silent=True)
        body = body if isinstance(body, dict) else {}
        email, password = _text(body, "email"), _text(body, "password")
        if email is None or password is None:
            return _error("validation", 'Expected {"email", "password", "deviceName"}.', 422)
        failure: tuple[Response, int] | None = None
        with session_factory() as session, session.begin():
            try:
                signed_in = student_auth.sign_in(
                    session,
                    email,
                    password,
                    request.remote_addr or "",
                    _text(body, "deviceName"),
                    _optional_uuid(body.get("replaceDeviceId")),
                )
            except auth.InvalidCredentialsError:
                failure = _error("invalid_credentials", "Wrong e-mail or password.", 401)
            except student_auth.DeviceLimitError as error:
                # The password was right: the devices may be shown to choose one to sign out.
                failure = _error(
                    "device_limit",
                    "Signed in on too many devices.",
                    409,
                    devices=[_device_json(device) for device in error.devices],
                )
        return failure if failure is not None else _signed_in_json(signed_in)

    @blueprint.post("/logout")
    def logout() -> ResponseReturnValue:
        token = bearer_token()
        if token is not None:
            with session_factory() as session, session.begin():
                if student_auth.authenticate(session, token) is not None:
                    auth.sign_out(session, token)
        return "", 204

    @blueprint.get("/me")
    def me() -> ResponseReturnValue:
        token = bearer_token()
        with session_factory() as session, session.begin():
            found = student_auth.authenticate(session, token) if token else None
            if found is None:
                return _error("unauthorized", "Sign in again.", 401)
            student, session_id = found
            devices = student_auth.devices(session, student.id, session_id)
        response = jsonify(
            {
                "student": {
                    "id": str(student.id),
                    "email": student.email,
                    "displayName": student.display_name,
                },
                "devices": [_device_json(device) for device in devices],
                "maxDevices": student_auth.MAX_DEVICES,
            }
        )
        response.headers["Cache-Control"] = "no-store"
        return response

    @blueprint.delete("/devices/<uuid:device_id>")
    def remove_device(device_id: uuid.UUID) -> ResponseReturnValue:
        token = bearer_token()
        with session_factory() as session, session.begin():
            found = student_auth.authenticate(session, token) if token else None
            if found is None:
                return _error("unauthorized", "Sign in again.", 401)
            if not student_auth.remove_device(session, found[0].id, device_id):
                return _error("not_found", "No such device.", 404)
        return "", 204

    return blueprint
