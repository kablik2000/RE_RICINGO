"""Fixtures for tests that need PostgreSQL.

They use a separate database (`TEST_DATABASE_URL`, default `rici_test` on the local Docker
stack), recreated for each test session and migrated with Alembic. When PostgreSQL is not
reachable, those tests are skipped locally but fail in CI (`REQUIRE_DATABASE=1`).
"""

import json
import os
import uuid
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, create_engine, make_url, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from rici_api import auth, lessons
from rici_api.app import create_app
from rici_api.config import Settings
from rici_api.mailer import Email, MailError
from rici_api.migrate import upgrade_database
from rici_api.models import Organization

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://rici:rici_dev_password@localhost:5432/rici_test"
)
ORGANIZATION = "RICI"
TEACHER_EMAIL = "lektorka@example.test"
# Test-only password (at least 15 characters, ADR-0012).
TEACHER_PASSWORD = "testovaci-heslo-pro-lektorku"
DEMO_LESSON = (
    Path(__file__).resolve().parents[3]
    / "apps"
    / "mobile"
    / "src"
    / "data"
    / "demo"
    / "al-bar.lesson.json"
)


def demo_bundle() -> dict[str, Any]:
    bundle: dict[str, Any] = json.loads(DEMO_LESSON.read_text("utf-8"))
    return bundle


@pytest.fixture(scope="session")
def database_engine() -> Iterator[Engine]:
    url = make_url(TEST_DATABASE_URL)
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as connection:
            connection.execute(text(f'DROP DATABASE IF EXISTS "{url.database}" WITH (FORCE)'))
            connection.execute(text(f'CREATE DATABASE "{url.database}"'))
    except OperationalError as error:
        if os.environ.get("REQUIRE_DATABASE") == "1":
            raise
        pytest.skip(f"PostgreSQL not reachable ({TEST_DATABASE_URL}): {error.orig}")
    finally:
        admin.dispose()

    engine = create_engine(url)
    upgrade_database(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def engine(database_engine: Engine) -> Iterator[Engine]:
    """A clean database for each test (published versions cannot be deleted row by row)."""
    with database_engine.begin() as connection:
        connection.execute(text("ALTER TABLE lesson_versions DISABLE TRIGGER USER"))
        connection.execute(
            text(
                "TRUNCATE lesson_versions, lessons, auth_sessions, login_attempts, invitations, "
                "teacher_students, users, organizations"
            )
        )
        connection.execute(text("ALTER TABLE lesson_versions ENABLE TRIGGER USER"))
    yield database_engine


class RecordingMailer:
    """Keeps e-mails instead of sending them; `fail` makes the next send fail."""

    def __init__(self) -> None:
        self.sent: list[Email] = []
        self.fail = False

    def send(self, email: Email) -> None:
        if self.fail:
            raise MailError("SMTP server unavailable.")
        self.sent.append(email)


@pytest.fixture
def mailbox() -> RecordingMailer:
    return RecordingMailer()


@pytest.fixture
def studio_app(engine: Engine, mailbox: RecordingMailer) -> Flask:
    return create_app(
        Settings(app_env="test", database_url=TEST_DATABASE_URL),
        engine=engine,
        mailer=mailbox,
    )


def organization_id(engine: Engine, name: str = ORGANIZATION) -> uuid.UUID:
    """The organization's ID, created if needed."""
    with Session(engine) as session, session.begin():
        org = session.scalar(select(Organization).where(Organization.name == name))
        if org is None:
            org = Organization(name=name)
            session.add(org)
            session.flush()
        return org.id


def import_demo(
    engine: Engine, organization: str = ORGANIZATION, visibility: lessons.Visibility = "public"
) -> str:
    """The demo lesson as a published lesson of `organization` (public unless told otherwise)."""
    org_id = organization_id(engine, organization)
    with Session(engine) as session, session.begin():
        return lessons.import_published_bundle(session, demo_bundle(), org_id, visibility)


def create_teacher(
    engine: Engine, email: str = TEACHER_EMAIL, organization: str = ORGANIZATION
) -> auth.Teacher:
    with Session(engine) as session, session.begin():
        return auth.create_teacher(session, email, "Lektorka", organization, TEACHER_PASSWORD)


def sign_in(client: FlaskClient, email: str = TEACHER_EMAIL) -> str:
    """Signs in and makes the client send the session token with every request."""
    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": TEACHER_PASSWORD}
    )
    assert response.status_code == 200, response.get_json()
    token: str = response.get_json()["token"]
    client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return token


@pytest.fixture
def teacher(engine: Engine) -> auth.Teacher:
    return create_teacher(engine)


@pytest.fixture
def anonymous_client(studio_app: Flask) -> FlaskClient:
    return studio_app.test_client()


@pytest.fixture
def client(studio_app: Flask, teacher: auth.Teacher) -> FlaskClient:
    """A client signed in as the teacher of organization "RICI"."""
    signed_in = studio_app.test_client()
    sign_in(signed_in)
    return signed_in
