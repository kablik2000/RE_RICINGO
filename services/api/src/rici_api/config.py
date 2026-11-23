"""Runtime configuration, read from environment variables (never from committed files)."""

import os
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

AppEnv = Literal["development", "test", "staging", "production"]
APP_ENVS: tuple[AppEnv, ...] = ("development", "test", "staging", "production")


class ConfigError(Exception):
    """The environment does not describe a valid configuration."""


@dataclass(frozen=True)
class Settings:
    app_env: AppEnv
    database_url: str


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
    return Settings(app_env=_app_env(env.get("APP_ENV")), database_url=database_url)
