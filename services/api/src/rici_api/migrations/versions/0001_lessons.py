"""Lessons (drafts) and immutable published lesson versions (ADR-0011).

Revision ID: 0001_lessons
Revises:
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_lessons"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "lessons",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("draft", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "lesson_versions",
        sa.Column("lesson_id", sa.String(100), sa.ForeignKey("lessons.id"), primary_key=True),
        sa.Column("version", sa.Integer(), primary_key=True),
        sa.Column("bundle", postgresql.JSONB(), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column(
            "published_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("version > 0", name="lesson_versions_version_positive"),
    )
    # Published versions are immutable (ADR-0003): reject any UPDATE or DELETE in the database,
    # whatever code path tries it.
    op.execute(
        """
        CREATE FUNCTION lesson_versions_immutable() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'published lesson versions are immutable (%)', TG_OP
            USING ERRCODE = 'restrict_violation';
        END;
        $$;
        """
    )
    op.execute(
        """
        CREATE TRIGGER lesson_versions_immutable
        BEFORE UPDATE OR DELETE ON lesson_versions
        FOR EACH ROW EXECUTE FUNCTION lesson_versions_immutable();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS lesson_versions_immutable ON lesson_versions")
    op.execute("DROP FUNCTION IF EXISTS lesson_versions_immutable()")
    op.drop_table("lesson_versions")
    op.drop_table("lessons")
