"""Runtime configuration, read from environment variables (never from committed files)."""

import os
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

AppEnv = Literal["development", "test", "staging", "production"]
APP_ENVS: tuple[AppEnv, ...] = ("development", "test", "staging", "production")


class ConfigError(Exception):
    """The environment does not describe a valid configuration."""


DEFAULT_MAIL_FROM = "Italština RICI <no-reply@rici.localhost>"


@dataclass(frozen=True)
class Settings:
    app_env: AppEnv
    database_url: str
    # Outgoing e-mail (invitations). Without SMTP_HOST, sending fails with a clear error.
    smtp_host: str | None = None
    smtp_port: int = 25
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_starttls: bool = False
    mail_from: str = DEFAULT_MAIL_FROM


def _app_env(raw: str | None) -> AppEnv:
    value = raw or "development"
    for env in APP_ENVS:
        if env == value:
            return env
    raise ConfigError(f"APP_ENV must be one of {', '.join(APP_ENVS)}, got {value!r}.")


def load_settings(environ: Mapping[str, str] | None = None) -> Settings:
    """Builds settings from the environment; fails fast with a clear message when invalid."""
    env = os.environ if environ is None else environ
    database_url = env.get("DATABASE_URL", "").strip()
    if not database_url:
        raise ConfigError("DATABASE_URL is not set (see .env.example).")
    port = env.get("SMTP_PORT", "25").strip() or "25"
    if not port.isdigit():
        raise ConfigError(f"SMTP_PORT must be a number, got {port!r}.")
    return Settings(
        app_env=_app_env(env.get("APP_ENV")),
        database_url=database_url,
        smtp_host=env.get("SMTP_HOST", "").strip() or None,
        smtp_port=int(port),
        smtp_username=env.get("SMTP_USERNAME") or None,
        smtp_password=env.get("SMTP_PASSWORD") or None,
        smtp_starttls=env.get("SMTP_STARTTLS", "").lower() in ("1", "true", "yes"),
        mail_from=env.get("MAIL_FROM", "").strip() or DEFAULT_MAIL_FROM,
    )
