"""Alembic environment: runs migrations against the engine handed over in `config.attributes`."""

from alembic import context
from sqlalchemy import Connection

from rici_api.models import Base

target_metadata = Base.metadata


def run_migrations_online() -> None:
    connection: Connection = context.config.attributes["connection"]
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


run_migrations_online()
