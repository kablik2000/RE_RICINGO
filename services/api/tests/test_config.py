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


def test_reads_mail_settings() -> None:
    settings = load_settings(
        {
            "DATABASE_URL": "postgresql://x",
            "SMTP_HOST": "mail",
            "SMTP_PORT": "1025",
            "SMTP_STARTTLS": "true",
            "MAIL_FROM": "RICI <noreply@example.test>",
        }
    )

    assert (settings.smtp_host, settings.smtp_port, settings.smtp_starttls) == ("mail", 1025, True)
    assert settings.mail_from == "RICI <noreply@example.test>"
    assert load_settings({"DATABASE_URL": "postgresql://x"}).smtp_host is None


def test_rejects_a_non_numeric_smtp_port() -> None:
    with pytest.raises(ConfigError, match="SMTP_PORT"):
        load_settings({"DATABASE_URL": "postgresql://x", "SMTP_PORT": "abc"})


def test_switches_platform_database_urls_to_psycopg() -> None:
    for url in ("postgres://u:p@db:5432/rici", "postgresql://u:p@db:5432/rici"):
        assert load_settings({"DATABASE_URL": url}).database_url == (
            "postgresql+psycopg://u:p@db:5432/rici"
        )


def test_reads_trusted_proxy_hops() -> None:
    assert load_settings({"DATABASE_URL": "postgresql://x"}).trusted_proxy_hops == 0
    settings = load_settings({"DATABASE_URL": "postgresql://x", "TRUSTED_PROXY_HOPS": "1"})
    assert settings.trusted_proxy_hops == 1
    with pytest.raises(ConfigError, match="TRUSTED_PROXY_HOPS"):
        load_settings({"DATABASE_URL": "postgresql://x", "TRUSTED_PROXY_HOPS": "yes"})
