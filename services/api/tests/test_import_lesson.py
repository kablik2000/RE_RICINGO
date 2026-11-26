"""The operator command `import-lesson`: published (demo seed) or as a draft for the Studio."""

import json
from pathlib import Path
from typing import Any

from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from rici_api.models import Lesson, LessonVersion

from .conftest import demo_bundle


def run_import(studio_app: Flask, path: Path, *args: str) -> Any:
    return studio_app.test_cli_runner().invoke(
        args=["import-lesson", str(path), "--organization", "RICI", *args]
    )


def write(tmp_path: Path, bundle: object) -> Path:
    path = tmp_path / "lesson.json"
    path.write_text(json.dumps(bundle), "utf-8")
    return path


def versions(engine: Engine, lesson_id: str) -> int:
    with Session(engine) as session:
        return (
            session.scalar(
                select(func.count())
                .select_from(LessonVersion)
                .where(LessonVersion.lesson_id == lesson_id)
            )
            or 0
        )


def test_a_draft_import_is_not_published_and_the_studio_can_publish_it(
    studio_app: Flask, client: FlaskClient, engine: Engine, tmp_path: Path
) -> None:
    bundle = demo_bundle()
    bundle["lesson"]["version"] = 7  # a version from another database means nothing here

    result = run_import(studio_app, write(tmp_path, bundle), "--draft", "--public")

    assert result.exit_code == 0, result.output
    assert "as a draft" in result.output
    assert versions(engine, "al-bar") == 0
    lesson = client.get("/api/v1/studio/lessons/al-bar").get_json()["lesson"]
    assert lesson["status"] == "draft"
    assert lesson["visibility"] == "public"
    published = client.post("/api/v1/studio/lessons/al-bar/publish")
    assert published.status_code == 200, published.get_json()
    assert published.get_json()["lesson"]["publishedVersion"] == 1


def test_an_incomplete_draft_is_imported_with_its_problems_listed(
    studio_app: Flask, engine: Engine, tmp_path: Path
) -> None:
    bundle = demo_bundle()
    bundle["lesson"]["titleItalian"] = ""

    result = run_import(studio_app, write(tmp_path, bundle), "--draft")

    assert result.exit_code == 0, result.output
    assert "problem(s) to fix in the Studio" in result.output
    with Session(engine) as session:
        lesson = session.get(Lesson, "al-bar")
        assert lesson is not None
        assert lesson.visibility == "students"


def test_without_draft_the_lesson_is_published(
    studio_app: Flask, engine: Engine, tmp_path: Path
) -> None:
    result = run_import(studio_app, write(tmp_path, demo_bundle()))

    assert result.exit_code == 0, result.output
    assert versions(engine, "al-bar") == 1


def test_an_existing_lesson_or_a_bad_file_is_refused_without_changes(
    studio_app: Flask, engine: Engine, tmp_path: Path
) -> None:
    path = write(tmp_path, demo_bundle())
    assert run_import(studio_app, path, "--draft").exit_code == 0

    again = run_import(studio_app, path, "--draft")
    no_id = run_import(studio_app, write(tmp_path, {"lesson": {"id": "Špatné ID"}}), "--draft")

    assert again.exit_code != 0
    assert "already exists" in again.output
    assert no_id.exit_code != 0
    assert "lesson.id" in no_id.output
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Lesson)) == 1
