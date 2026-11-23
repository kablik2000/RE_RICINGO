import pytest

from rici_api.config import ConfigError, load_settings


def test_reads_database_url_and_defaults_to_development() -> None:
    settings = load_settings({"DATABASE_URL": "postgresql+psycopg://u:p@db/rici"})

    assert settings.database_url == "postgresql+psycopg://u:p@db/rici"
    assert settings.app_env == "development"


def test_requires_database_url() -> None:
    with pytest.raises(ConfigError, match="DATABASE_URL"):
        load_settings({})


def test_rejects_unknown_environment() -> None:
    with pytest.raises(ConfigError, match="APP_ENV"):
        load_settings({"DATABASE_URL": "postgresql://x", "APP_ENV": "prod"})
