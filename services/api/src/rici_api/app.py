"""Flask application factory."""

import json
from collections.abc import Callable
from functools import partial
from pathlib import Path

import click
from flask import Blueprint, Flask, jsonify
from flask.typing import ResponseReturnValue
from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker
from werkzeug.exceptions import HTTPException

from rici_api import lessons
from rici_api.config import Settings, load_settings
from rici_api.content_api import content_blueprint
from rici_api.db import create_db_engine, database_is_reachable
from rici_api.migrate import upgrade_database
from rici_api.studio_api import studio_blueprint

DatabaseCheck = Callable[[], bool]

# Environments where the unauthenticated Studio and content endpoints may run (ADR-0011).
STUDIO_ENVIRONMENTS = ("development", "test")


def create_app(
    settings: Settings | None = None,
    database_check: DatabaseCheck | None = None,
    engine: Engine | None = None,
) -> Flask:
    """Creates the API. Tests inject `settings`, `database_check` and/or a test `engine`."""
    resolved = settings or load_settings()
    app = Flask(__name__)
    app.config["APP_ENV"] = resolved.app_env

    db_engine = engine or create_db_engine(resolved.database_url)
    session_factory = sessionmaker(bind=db_engine, expire_on_commit=False)
    check = database_check or partial(database_is_reachable, db_engine)

    app.register_blueprint(_v1_blueprint(check), url_prefix="/api/v1")
    if resolved.app_env in STUDIO_ENVIRONMENTS:
        app.register_blueprint(studio_blueprint(session_factory), url_prefix="/api/v1/studio")
        app.register_blueprint(content_blueprint(session_factory), url_prefix="/api/v1/content")
    _register_error_handlers(app)
    _register_commands(app, db_engine, session_factory)
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


def _register_commands(app: Flask, engine: Engine, session_factory: sessionmaker[Session]) -> None:
    @app.cli.command("db-upgrade")
    def db_upgrade() -> None:
        """Applies all database migrations."""
        upgrade_database(engine)
        click.echo("Database schema is up to date.")

    @app.cli.command("import-lesson")
    @click.argument("path", type=click.Path(exists=True, dir_okay=False, path_type=Path))
    def import_lesson(path: Path) -> None:
        """Imports a published lesson bundle (JSON file), e.g. the demo lesson."""
        bundle = json.loads(path.read_text("utf-8"))
        with session_factory() as session, session.begin():
            lesson_id = lessons.import_published_bundle(session, bundle)
        click.echo(f"Imported lesson {lesson_id}.")
