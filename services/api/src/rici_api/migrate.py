"""Runs Alembic migrations programmatically (the scripts ship inside the package)."""

from importlib.resources import files

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine


def upgrade_database(engine: Engine, revision: str = "head") -> None:
    """Brings the database schema to `revision` (default: the newest)."""
    config = Config()
    config.set_main_option("script_location", str(files("rici_api").joinpath("migrations")))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, revision)
