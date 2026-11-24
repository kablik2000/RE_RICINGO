from typing import Any

from flask.testing import FlaskClient
from sqlalchemy import Engine

from rici_api.app import create_app
from rici_api.config import Settings

from .conftest import TEST_DATABASE_URL, demo_bundle, import_demo


def test_catalog_lists_the_newest_published_version(client: FlaskClient, engine: Engine) -> None:
    import_demo(engine)
    draft = demo_bundle()
    draft["lesson"]["goal"] = "Objednat si kávu u baru."
    client.put("/api/v1/studio/lessons/al-bar", json={"draft": draft})
    client.post("/api/v1/studio/lessons/al-bar/publish")

    body: Any = client.get("/api/v1/content/lessons").get_json()

    [lesson] = body["lessons"]
    assert lesson["id"] == "al-bar"
    assert lesson["version"] == 2
    assert len(lesson["checksum"]) == 64
    assert lesson["titleItalian"] == "Al bar"
    assert lesson["level"] == "A1"


def test_unpublished_drafts_are_not_in_the_catalog(client: FlaskClient, engine: Engine) -> None:
    client.post("/api/v1/studio/lessons", json={"titleItalian": "Alla stazione"})

    body: Any = client.get("/api/v1/content/lessons").get_json()

    assert body["lessons"] == []


def test_unpublished_lessons_leave_the_catalog_until_published_again(
    client: FlaskClient, engine: Engine
) -> None:
    import_demo(engine)

    client.post("/api/v1/studio/lessons/al-bar/unpublish")

    assert client.get("/api/v1/content/lessons").get_json()["lessons"] == []
    assert client.get("/api/v1/content/lessons/al-bar/versions/1").status_code == 404

    client.post("/api/v1/studio/lessons/al-bar/publish")

    [lesson] = client.get("/api/v1/content/lessons").get_json()["lessons"]
    assert lesson["version"] == 1


def test_a_published_version_is_served_as_immutable(client: FlaskClient, engine: Engine) -> None:
    import_demo(engine)

    response = client.get("/api/v1/content/lessons/al-bar/versions/1")

    assert response.status_code == 200
    assert "immutable" in response.headers["Cache-Control"]
    body: Any = response.get_json()
    assert body["version"] == 1
    assert body["bundle"]["lesson"]["id"] == "al-bar"
    catalog: Any = client.get("/api/v1/content/lessons").get_json()
    assert body["checksum"] == catalog["lessons"][0]["checksum"]


def test_unknown_versions_are_not_found(client: FlaskClient, engine: Engine) -> None:
    import_demo(engine)

    assert client.get("/api/v1/content/lessons/al-bar/versions/7").status_code == 404
    assert client.get("/api/v1/content/lessons/nope/versions/1").status_code == 404


def test_the_public_catalog_needs_no_account_in_production(engine: Engine) -> None:
    import_demo(engine)
    app = create_app(Settings(app_env="production", database_url=TEST_DATABASE_URL), engine=engine)
    anonymous = app.test_client()

    [lesson] = anonymous.get("/api/v1/content/lessons").get_json()["lessons"]
    assert lesson["id"] == "al-bar"
    assert anonymous.get("/api/v1/content/lessons/al-bar/versions/1").status_code == 200


def test_lessons_for_students_only_are_not_public(engine: Engine, client: FlaskClient) -> None:
    import_demo(engine, visibility="students")

    assert client.get("/api/v1/content/lessons").get_json()["lessons"] == []
    assert client.get("/api/v1/content/lessons/al-bar/versions/1").status_code == 404


def test_changing_visibility_applies_to_the_catalog_at_once(
    engine: Engine, client: FlaskClient
) -> None:
    import_demo(engine, visibility="students")

    response = client.put("/api/v1/studio/lessons/al-bar/visibility", json={"visibility": "public"})

    assert response.status_code == 200
    assert response.get_json()["lesson"]["visibility"] == "public"
    assert len(client.get("/api/v1/content/lessons").get_json()["lessons"]) == 1

    client.put("/api/v1/studio/lessons/al-bar/visibility", json={"visibility": "students"})
    assert client.get("/api/v1/content/lessons").get_json()["lessons"] == []


def test_visibility_must_be_known(engine: Engine, client: FlaskClient) -> None:
    import_demo(engine)

    for body in ({"visibility": "everyone"}, {"visibility": 1}, {}):
        response = client.put("/api/v1/studio/lessons/al-bar/visibility", json=body)
        assert response.status_code == 422, body


def test_new_lessons_are_for_students_only(client: FlaskClient) -> None:
    client.post("/api/v1/studio/lessons", json={"titleItalian": "Alla stazione"})

    lesson = client.get("/api/v1/studio/lessons/alla-stazione").get_json()["lesson"]
    assert lesson["visibility"] == "students"


def test_a_teacher_cannot_change_another_organizations_lesson(
    engine: Engine, client: FlaskClient
) -> None:
    import_demo(engine, organization="Jina skola", visibility="students")

    response = client.put("/api/v1/studio/lessons/al-bar/visibility", json={"visibility": "public"})

    assert response.status_code == 404
    assert client.get("/api/v1/content/lessons").get_json()["lessons"] == []
