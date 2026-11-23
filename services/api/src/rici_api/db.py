"""Database access (PostgreSQL through SQLAlchemy)."""

import logging

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


def create_db_engine(database_url: str) -> Engine:
    # pool_pre_ping: recover transparently from connections dropped by the server or network.
    return create_engine(database_url, pool_pre_ping=True)


def database_is_reachable(engine: Engine) -> bool:
    """True when a trivial query succeeds. Failures are logged, not raised (health checks)."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        return False
    return True
