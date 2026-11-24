"""Students and invitations (ADR-0013): student accounts, teacher-student links, invitations.

Revision ID: 0005_students_and_invitations
Revises: 0004_lesson_visibility
Create Date: 2026-11-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_students_and_invitations"
down_revision: str | None = "0004_lesson_visibility"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("users_role_known", "users", type_="check")
    op.create_check_constraint("users_role_known", "users", "role IN ('teacher', 'student')")
    op.add_column(
        "users",
        sa.Column("is_minor", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("users", sa.Column("parental_consent_at", sa.DateTime(timezone=True)))

    op.create_table(
        "teacher_students",
        sa.Column(
            "teacher_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "student_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
            index=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_table(
        "invitations",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column(
            "teacher_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("email", sa.String(254), nullable=False, index=True),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("is_minor", sa.Boolean(), nullable=False),
        sa.Column("parental_consent_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "NOT is_minor OR parental_consent_at IS NOT NULL",
            name="invitations_minor_needs_consent",
        ),
    )


def downgrade() -> None:
    op.drop_table("invitations")
    op.drop_table("teacher_students")
    op.drop_column("users", "parental_consent_at")
    op.drop_column("users", "is_minor")
    op.execute("DELETE FROM users WHERE role = 'student'")
    op.drop_constraint("users_role_known", "users", type_="check")
    op.create_check_constraint("users_role_known", "users", "role IN ('teacher')")
