"""Lessons can be unpublished: hidden from students, their versions kept (ADR-0011).

Revision ID: 0002_lesson_unpublished_at
Revises: 0001_lessons
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_lesson_unpublished_at"
down_revision: str | None = "0001_lessons"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("lessons", sa.Column("unpublished_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    op.drop_column("lessons", "unpublished_at")
