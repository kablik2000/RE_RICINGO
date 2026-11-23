"""Sign-in endpoints `/api/v1/auth/*` and the guard for Studio endpoints (ADR-0012).

The Teacher Studio's server calls these on the lecturer's behalf; browsers never talk to the API
directly (no CORS). The session token travels as `Authorization: Bearer <token>`.
"""

from collections.abc import Callable

from flask import Blueprint, g, jsonify, request
from flask.typing import ResponseReturnValue
from sqlalchemy.orm import Session

from rici_api import auth

SessionFactory = Callable[[], Session]


def _error(code: str, message: str, status: int) -> ResponseReturnValue:
    return jsonify({"error": {"code": code, "message": message}}), status


def _teacher_json(teacher: auth.Teacher) -> dict[str, str]:
    return {
        "id": str(teacher.id),
        "email": teacher.email,
        "displayName": teacher.display_name,
        "organizationId": str(teacher.organization_id),
    }


def bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    return token.strip() if scheme.lower() == "bearer" and token.strip() else None


def require_teacher(session_factory: SessionFactory) -> Callable[[], ResponseReturnValue | None]:
    """A `before_request` hook: answers 401 unless the request carries a valid teacher session,
    and puts the teacher into `g.teacher`."""

    def guard() -> ResponseReturnValue | None:
        token = bearer_token()
        teacher = None
        if token is not None:
            with session_factory() as session, session.begin():
                teacher = auth.authenticate(session, token)
        if teacher is None:
            return _error("unauthorized", "Sign in to the Teacher Studio.", 401)
        g.teacher = teacher
        return None

    return guard


def auth_blueprint(session_factory: SessionFactory) -> Blueprint:
    blueprint = Blueprint("auth", __name__)

    @blueprint.post("/login")
    def login() -> ResponseReturnValue:
        body = request.get_json(silent=True)
        email = body.get("email") if isinstance(body, dict) else None
        password = body.get("password") if isinstance(body, dict) else None
        if not isinstance(email, str) or not isinstance(password, str) or not email or not password:
            return _error("validation", 'Expected {"email": ..., "password": ...}.', 422)
        try:
            with session_factory() as session, session.begin():
                try:
                    signed_in = auth.sign_in(session, email, password, request.remote_addr or "")
                except auth.InvalidCredentialsError:
                    # Keep the recorded failed attempt: commit, then answer 401 below.
                    signed_in = None
        except auth.TooManyAttemptsError as error:
            response = jsonify(
                {
                    "error": {
                        "code": "too_many_attempts",
                        "message": "Too many failed sign-in attempts.",
                        "retryAfter": error.retry_after_seconds,
                    }
                }
            )
            response.headers["Retry-After"] = str(error.retry_after_seconds)
            return response, 429
        if signed_in is None:
            return _error("invalid_credentials", "Wrong e-mail or password.", 401)
        response = jsonify(
            {
                "token": signed_in.token,
                "expiresAt": signed_in.expires_at.isoformat(),
                "teacher": _teacher_json(signed_in.teacher),
            }
        )
        response.headers["Cache-Control"] = "no-store"
        return response

    @blueprint.post("/logout")
    def logout() -> ResponseReturnValue:
        token = bearer_token()
        if token is not None:
            with session_factory() as session, session.begin():
                auth.sign_out(session, token)
        return "", 204

    @blueprint.get("/me")
    def me() -> ResponseReturnValue:
        token = bearer_token()
        teacher = None
        if token is not None:
            with session_factory() as session, session.begin():
                teacher = auth.authenticate(session, token)
        if teacher is None:
            return _error("unauthorized", "Sign in to the Teacher Studio.", 401)
        response = jsonify({"teacher": _teacher_json(teacher)})
        response.headers["Cache-Control"] = "no-store"
        return response

    return blueprint
