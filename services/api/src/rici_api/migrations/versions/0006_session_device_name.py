"""Device name on sessions, for the student's device list (ADR-0013).

Revision ID: 0006_session_device_name
Revises: 0005_students_and_invitations
Create Date: 2026-11-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_session_device_name"
down_revision: str | None = "0005_students_and_invitations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("auth_sessions", sa.Column("device_name", sa.String(100)))


def downgrade() -> None:
    op.drop_column("auth_sessions", "device_name")
