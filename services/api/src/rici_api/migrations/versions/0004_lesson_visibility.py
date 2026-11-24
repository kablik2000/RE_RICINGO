"""Lesson visibility: public (everyone) or students only (ADR-0013).

New lessons are for students only. Lessons that are already published were in the (development)
catalog for everyone, so they stay public; drafts become students-only.

Revision ID: 0004_lesson_visibility
Revises: 0003_accounts
Create Date: 2026-11-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_lesson_visibility"
down_revision: str | None = "0003_accounts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "lessons",
        sa.Column("visibility", sa.String(20), nullable=False, server_default="students"),
    )
    op.create_check_constraint(
        "lessons_visibility_known", "lessons", "visibility IN ('public', 'students')"
    )
    op.execute(
        "UPDATE lessons SET visibility = 'public' "
        "WHERE EXISTS (SELECT 1 FROM lesson_versions v WHERE v.lesson_id = lessons.id)"
    )


def downgrade() -> None:
    op.drop_constraint("lessons_visibility_known", "lessons", type_="check")
    op.drop_column("lessons", "visibility")
