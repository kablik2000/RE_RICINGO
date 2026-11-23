from typing import Any

from flask.testing import FlaskClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from rici_api import lessons
from rici_api.app import create_app
from rici_api.config import Settings

from .conftest import TEST_DATABASE_URL, demo_bundle


def import_demo(engine: Engine) -> None:
    with Session(engine) as session, session.begin():
        lessons.import_published_bundle(session, demo_bundle())


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


def test_content_endpoints_are_not_served_in_production(engine: Engine) -> None:
    app = create_app(Settings(app_env="production", database_url=TEST_DATABASE_URL), engine=engine)

    assert app.test_client().get("/api/v1/content/lessons").status_code == 404
