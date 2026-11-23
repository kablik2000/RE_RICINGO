"""Organizations, Studio accounts, sessions and sign-in throttling (ADR-0012).

Existing lessons move into an organization named "RICI", created only when there are lessons.

Revision ID: 0003_accounts
Revises: 0002_lesson_unpublished_at
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_accounts"
down_revision: str | None = "0002_lesson_unpublished_at"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_ORGANIZATION = "RICI"


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "password_changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("role IN ('teacher')", name="users_role_known"),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "login_attempts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email_key", sa.String(64), nullable=False, index=True),
        sa.Column("address", sa.String(64), nullable=False, index=True),
        sa.Column("succeeded", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, index=True),
    )

    op.add_column("lessons", sa.Column("organization_id", sa.Uuid(), nullable=True))
    op.execute(
        sa.text(
            "INSERT INTO organizations (name) SELECT :name WHERE EXISTS (SELECT 1 FROM lessons)"
        ).bindparams(name=DEFAULT_ORGANIZATION)
    )
    op.execute(
        sa.text(
            "UPDATE lessons SET organization_id = (SELECT id FROM organizations WHERE name = :name)"
        ).bindparams(name=DEFAULT_ORGANIZATION)
    )
    op.alter_column("lessons", "organization_id", nullable=False)
    op.create_foreign_key(
        "lessons_organization_id_fkey", "lessons", "organizations", ["organization_id"], ["id"]
    )
    op.create_index("ix_lessons_organization_id", "lessons", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_lessons_organization_id", table_name="lessons")
    op.drop_constraint("lessons_organization_id_fkey", "lessons", type_="foreignkey")
    op.drop_column("lessons", "organization_id")
    op.drop_table("login_attempts")
    op.drop_table("auth_sessions")
    op.drop_table("users")
    op.drop_table("organizations")
