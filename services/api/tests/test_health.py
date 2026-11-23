from flask import Flask

from rici_api.app import create_app
from rici_api.config import Settings

SETTINGS = Settings(app_env="test", database_url="postgresql+psycopg://unused/rici")


def make_app(database_ok: bool) -> Flask:
    return create_app(SETTINGS, database_check=lambda: database_ok)


def test_health_is_ok_when_the_database_answers() -> None:
    response = make_app(database_ok=True).test_client().get("/api/v1/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "database": "ok"}


def test_health_reports_an_unavailable_database() -> None:
    response = make_app(database_ok=False).test_client().get("/api/v1/health")

    assert response.status_code == 503
    assert response.get_json() == {"status": "degraded", "database": "unavailable"}


def test_unknown_routes_return_json_errors() -> None:
    response = make_app(database_ok=True).test_client().get("/api/v1/does-not-exist")

    assert response.status_code == 404
    body = response.get_json()
    assert body is not None
    assert body["error"]["code"] == "not_found"
