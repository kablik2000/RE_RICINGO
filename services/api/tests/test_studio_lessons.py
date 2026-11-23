import copy
from typing import Any

import pytest
from flask.testing import FlaskClient
from sqlalchemy import Engine, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from rici_api import lessons
from rici_api.app import create_app
from rici_api.config import Settings

from .conftest import TEST_DATABASE_URL, demo_bundle


def import_demo(engine: Engine) -> str:
    with Session(engine) as session, session.begin():
        return lessons.import_published_bundle(session, demo_bundle())


def test_imported_demo_lesson_is_listed_as_published(client: FlaskClient, engine: Engine) -> None:
    import_demo(engine)

    body: Any = client.get("/api/v1/studio/lessons").get_json()

    [lesson] = body["lessons"]
    assert lesson["id"] == "al-bar"
    assert lesson["titleItalian"] == "Al bar"
    assert lesson["sentenceCount"] == 12
    assert lesson["exchangeCount"] == 4
    assert lesson["lexemeCount"] == 21
    assert lesson["status"] == "published"
    assert lesson["publishedVersion"] == 1


def test_overview_counts_published_content(client: FlaskClient, engine: Engine) -> None:
    import_demo(engine)

    body: Any = client.get("/api/v1/studio/overview").get_json()

    assert body["lessons"] == {"total": 1, "published": 1, "withDraftChanges": 0}
    assert body["publishedLexemes"] == 21
    assert body["publishedGrammarTopics"] == 7


def test_saving_a_change_marks_the_lesson_changed(client: FlaskClient, engine: Engine) -> None:
    import_demo(engine)
    draft = demo_bundle()
    draft["lesson"]["goal"] = "Objednat si kávu."

    response = client.put("/api/v1/studio/lessons/al-bar", json={"draft": draft})

    assert response.status_code == 200
    body: Any = response.get_json()
    assert body["lesson"]["status"] == "changed"
    assert body["issues"] == []
    assert client.get("/api/v1/studio/lessons/al-bar").get_json()["draft"]["lesson"]["goal"] == (
        "Objednat si kávu."
    )


def test_incomplete_drafts_are_saved_with_their_problems(
    client: FlaskClient, engine: Engine
) -> None:
    import_demo(engine)
    draft = demo_bundle()
    draft["lesson"]["turns"][0]["sentences"][0]["segments"][0]["text"] = "Buonasera"

    body: Any = client.put("/api/v1/studio/lessons/al-bar", json={"draft": draft}).get_json()

    assert body["issues"] == [
        {
            "path": "$.lesson.turns[0].sentences[0]",
            "message": 'segment "Buonasera" is not found in "Buongiorno!" after position 0',
        }
    ]


def test_publishing_creates_the_next_version(client: FlaskClient, engine: Engine) -> None:
    import_demo(engine)
    draft = demo_bundle()
    draft["lesson"]["goal"] = "Objednat si kávu."
    client.put("/api/v1/studio/lessons/al-bar", json={"draft": draft})

    response = client.post("/api/v1/studio/lessons/al-bar/publish")

    assert response.status_code == 200
    lesson: Any = response.get_json()["lesson"]
    assert (lesson["publishedVersion"], lesson["status"]) == (2, "published")
    assert client.get("/api/v1/studio/lessons/al-bar").get_json()["draft"]["lesson"]["version"] == 2


def test_publishing_refuses_problems_and_unchanged_content(
    client: FlaskClient, engine: Engine
) -> None:
    import_demo(engine)

    unchanged = client.post("/api/v1/studio/lessons/al-bar/publish")
    assert unchanged.status_code == 422

    draft = copy.deepcopy(demo_bundle())
    draft["lexemes"] = []
    client.put("/api/v1/studio/lessons/al-bar", json={"draft": draft})
    broken = client.post("/api/v1/studio/lessons/al-bar/publish")

    assert broken.status_code == 422
    assert any(
        "unknown lexeme" in issue["message"] for issue in broken.get_json()["error"]["issues"]
    )


def test_new_lessons_get_a_unique_slug(client: FlaskClient) -> None:
    first = client.post("/api/v1/studio/lessons", json={"titleItalian": "Alla stazione"})
    second = client.post("/api/v1/studio/lessons", json={"titleItalian": "Alla stazione"})

    assert (first.status_code, first.get_json()) == (201, {"id": "alla-stazione"})
    assert second.get_json() == {"id": "alla-stazione-2"}
    lesson: Any = client.get("/api/v1/studio/lessons/alla-stazione").get_json()
    assert lesson["lesson"]["status"] == "draft"
    assert lesson["issues"] != []


def test_unknown_lessons_and_mismatched_ids_are_rejected(
    client: FlaskClient, engine: Engine
) -> None:
    import_demo(engine)

    assert client.get("/api/v1/studio/lessons/nope").status_code == 404
    other = demo_bundle()
    other["lesson"]["id"] = "something-else"
    assert client.put("/api/v1/studio/lessons/al-bar", json={"draft": other}).status_code == 422


def test_published_versions_are_immutable_in_the_database(engine: Engine) -> None:
    import_demo(engine)

    with pytest.raises(DBAPIError, match="immutable"), engine.begin() as connection:
        connection.execute(text("UPDATE lesson_versions SET checksum = 'x'"))


def test_studio_endpoints_do_not_exist_outside_development(engine: Engine) -> None:
    app = create_app(Settings(app_env="production", database_url=TEST_DATABASE_URL), engine=engine)

    assert app.test_client().get("/api/v1/studio/lessons").status_code == 404
