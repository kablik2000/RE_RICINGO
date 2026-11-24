"""Flask application factory."""

import json
from collections.abc import Callable
from functools import partial
from pathlib import Path

import click
from flask import Blueprint, Flask, jsonify
from flask.typing import ResponseReturnValue
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session, sessionmaker
from werkzeug.exceptions import HTTPException

from rici_api import auth, lessons
from rici_api.auth_api import auth_blueprint
from rici_api.config import Settings, load_settings
from rici_api.content_api import content_blueprint
from rici_api.db import create_db_engine, database_is_reachable
from rici_api.mailer import Mailer, SmtpMailer, UnconfiguredMailer
from rici_api.migrate import upgrade_database
from rici_api.models import Organization
from rici_api.studio_api import studio_blueprint

DatabaseCheck = Callable[[], bool]

# Largest request body accepted (a lesson draft is well below this).
MAX_REQUEST_BYTES = 2 * 1024 * 1024


def create_app(
    settings: Settings | None = None,
    database_check: DatabaseCheck | None = None,
    engine: Engine | None = None,
    mailer: Mailer | None = None,
) -> Flask:
    """Creates the API. Tests inject `settings`, `database_check`, a test `engine` and/or a
    `mailer` that records e-mails instead of sending them."""
    resolved = settings or load_settings()
    app = Flask(__name__)
    app.config["APP_ENV"] = resolved.app_env
    app.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_BYTES

    db_engine = engine or create_db_engine(resolved.database_url)
    session_factory = sessionmaker(bind=db_engine, expire_on_commit=False)
    check = database_check or partial(database_is_reachable, db_engine)

    app.register_blueprint(_v1_blueprint(check), url_prefix="/api/v1")
    app.register_blueprint(auth_blueprint(session_factory), url_prefix="/api/v1/auth")
    app.register_blueprint(
        studio_blueprint(session_factory, mailer or _mailer(resolved)), url_prefix="/api/v1/studio"
    )
    # Public lessons for everyone, without an account (ADR-0013).
    app.register_blueprint(content_blueprint(session_factory), url_prefix="/api/v1/content")
    _register_error_handlers(app)
    _register_commands(app, db_engine, session_factory)
    return app


def _mailer(settings: Settings) -> Mailer:
    if settings.smtp_host is None:
        return UnconfiguredMailer()
    return SmtpMailer(
        host=settings.smtp_host,
        port=settings.smtp_port,
        sender=settings.mail_from,
        username=settings.smtp_username,
        password=settings.smtp_password,
        starttls=settings.smtp_starttls,
    )


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
    @click.option("--organization", required=True, help="Organization (created if new).")
    @click.option("--public", is_flag=True, help="Visible to everyone (default: students only).")
    def import_lesson(path: Path, organization: str, public: bool) -> None:
        """Imports a published lesson bundle (JSON file), e.g. the demo lesson."""
        bundle = json.loads(path.read_text("utf-8"))
        with session_factory() as session, session.begin():
            org = session.scalar(select(Organization).where(Organization.name == organization))
            if org is None:
                org = Organization(name=organization)
                session.add(org)
                session.flush()
            lesson_id = lessons.import_published_bundle(
                session, bundle, org.id, "public" if public else "students"
            )
        click.echo(f"Imported lesson {lesson_id}.")

    # Accounts are created by an operator; there is no public sign-up (ADR-0004, ADR-0012).
    # Passwords are asked for interactively, so they never appear in the shell history.
    @app.cli.command("create-teacher")
    @click.argument("email")
    @click.option("--name", required=True, help="Name shown in the Studio.")
    @click.option("--organization", required=True, help="Organization (created if new).")
    @click.password_option(help="Asked for when not given.")
    def create_teacher(email: str, name: str, organization: str, password: str) -> None:
        """Creates a Teacher Studio account."""
        try:
            with session_factory() as session, session.begin():
                teacher = auth.create_teacher(session, email, name, organization, password)
        except auth.AccountError as error:
            raise click.ClickException(str(error)) from error
        click.echo(f"Created teacher {teacher.email}.")

    @app.cli.command("set-password")
    @click.argument("email")
    @click.password_option(help="Asked for when not given.")
    def set_password(email: str, password: str) -> None:
        """Sets a new password and signs the account out everywhere."""
        try:
            with session_factory() as session, session.begin():
                auth.set_password(session, email, password)
        except auth.AccountError as error:
            raise click.ClickException(str(error)) from error
        click.echo("Password changed; all sessions of the account ended.")

    @app.cli.command("disable-teacher")
    @click.argument("email")
    def disable_teacher(email: str) -> None:
        """Blocks an account and ends its sessions (enable again with enable-teacher)."""
        try:
            with session_factory() as session, session.begin():
                auth.set_active(session, email, active=False)
        except auth.AccountError as error:
            raise click.ClickException(str(error)) from error
        click.echo("Account disabled.")

    @app.cli.command("enable-teacher")
    @click.argument("email")
    def enable_teacher(email: str) -> None:
        """Allows a disabled account to sign in again."""
        try:
            with session_factory() as session, session.begin():
                auth.set_active(session, email, active=True)
        except auth.AccountError as error:
            raise click.ClickException(str(error)) from error
        click.echo("Account enabled.")
