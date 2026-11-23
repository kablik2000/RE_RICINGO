"""Fixtures for tests that need PostgreSQL.

They use a separate database (`TEST_DATABASE_URL`, default `rici_test` on the local Docker
stack), recreated for each test session and migrated with Alembic. When PostgreSQL is not
reachable, those tests are skipped locally but fail in CI (`REQUIRE_DATABASE=1`).
"""

import json
import os
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, create_engine, make_url, text
from sqlalchemy.exc import OperationalError

from rici_api.app import create_app
from rici_api.config import Settings
from rici_api.migrate import upgrade_database

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://rici:rici_dev_password@localhost:5432/rici_test"
)
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
        connection.execute(text("TRUNCATE lesson_versions, lessons"))
        connection.execute(text("ALTER TABLE lesson_versions ENABLE TRIGGER USER"))
    yield database_engine


@pytest.fixture
def studio_app(engine: Engine) -> Flask:
    return create_app(
        Settings(app_env="test", database_url=TEST_DATABASE_URL),
        engine=engine,
    )


@pytest.fixture
def client(studio_app: Flask) -> FlaskClient:
    return studio_app.test_client()
