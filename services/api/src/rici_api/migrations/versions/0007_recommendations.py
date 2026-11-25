"""Lecturer recommendations per student (ADR-0013 step 4).

Revision ID: 0007_recommendations
Revises: 0006_session_device_name
Create Date: 2026-11-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_recommendations"
down_revision: str | None = "0006_session_device_name"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "recommendations",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("teacher_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False, index=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column(
            "lesson_id",
            sa.String(100),
            sa.ForeignKey("lessons.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("grammar_topic_id", sa.String(100)),
        sa.Column(
            "lexeme_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("note", sa.String(500)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        # Ending the teacher-student link removes that teacher's recommendations.
        sa.ForeignKeyConstraint(
            ["teacher_id", "student_id"],
            ["teacher_students.teacher_id", "teacher_students.student_id"],
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "kind IN ('lesson', 'practice', 'vocabulary')", name="recommendations_kind_known"
        ),
        sa.CheckConstraint(
            "kind = 'practice' OR grammar_topic_id IS NULL",
            name="recommendations_topic_only_for_practice",
        ),
        sa.CheckConstraint(
            "(kind = 'vocabulary') = (jsonb_array_length(lexeme_ids) > 0)",
            name="recommendations_words_only_for_vocabulary",
        ),
    )


def downgrade() -> None:
    op.drop_table("recommendations")
