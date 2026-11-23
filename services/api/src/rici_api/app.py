"""Flask application factory."""

from collections.abc import Callable
from functools import partial

from flask import Blueprint, Flask, jsonify
from flask.typing import ResponseReturnValue
from werkzeug.exceptions import HTTPException

from rici_api.config import Settings, load_settings
from rici_api.db import create_db_engine, database_is_reachable

DatabaseCheck = Callable[[], bool]


def create_app(
    settings: Settings | None = None,
    database_check: DatabaseCheck | None = None,
) -> Flask:
    """Creates the API. Tests inject `settings` and `database_check` instead of a real database."""
    resolved = settings or load_settings()
    app = Flask(__name__)
    app.config["APP_ENV"] = resolved.app_env

    check = database_check
    if check is None:
        engine = create_db_engine(resolved.database_url)
        check = partial(database_is_reachable, engine)

    app.register_blueprint(_v1_blueprint(check), url_prefix="/api/v1")
    _register_error_handlers(app)
    return app


def _v1_blueprint(database_check: DatabaseCheck) -> Blueprint:
    v1 = Blueprint("v1", __name__)

    @v1.get("/health")
    def health() -> ResponseReturnValue:
        database_ok = database_check()
        body = {
            "status": "ok" if database_ok else "degraded",
            "database": "ok" if database_ok else "unavailable",
        }
        return jsonify(body), 200 if database_ok else 503

    return v1


def _register_error_handlers(app: Flask) -> None:
    """Every error leaves the API as JSON `{"error": {"code", "message"}}`."""

    @app.errorhandler(HTTPException)
    def http_error(error: HTTPException) -> ResponseReturnValue:
        code = (error.name or "error").lower().replace(" ", "_")
        status = error.code or 500
        return jsonify({"error": {"code": code, "message": error.description}}), status
