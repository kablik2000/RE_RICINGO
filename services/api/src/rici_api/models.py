"""Database tables (SQLAlchemy 2). Schema changes go through Alembic migrations in `migrations/`."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Organization(Base):
    """A school or a lecturer's practice; every teacher and lesson belongs to one (ADR-0012)."""

    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class User(Base):
    """An account: a teacher (created by an operator) or a student (by invitation, ADR-0013)."""

    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('teacher', 'student')", name="users_role_known"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False
    )
    # Normalised (trimmed, NFKC, lower case) so lookups are exact.
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    # Argon2id PHC string, never the password.
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    password_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Students under 15 (CZ age of digital consent): the inviting teacher confirmed the parents'
    # consent at this time (GDPR art. 8). Only this flag and the time are kept, no birth date.
    is_minor: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    parental_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TeacherStudent(Base):
    """A student of a teacher: the teacher sees the student and recommends lessons to them."""

    __tablename__ = "teacher_students"

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Invitation(Base):
    """An invitation e-mailed to a future student. Only the SHA-256 of its code is stored."""

    __tablename__ = "invitations"
    __table_args__ = (
        CheckConstraint(
            "NOT is_minor OR parental_consent_at IS NOT NULL",
            name="invitations_minor_needs_consent",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(254), index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    is_minor: Mapped[bool] = mapped_column(Boolean, nullable=False)
    parental_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuthSession(Base):
    """A signed-in Studio session. Only the SHA-256 of the token is stored."""

    __tablename__ = "auth_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    # Students: the device's name as the app reports it ("Pixel 7"), shown in the device list.
    device_name: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class LoginAttempt(Base):
    """One sign-in attempt, for throttling. The e-mail is stored only as a SHA-256 key."""

    __tablename__ = "login_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email_key: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    address: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    succeeded: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )


class Lesson(Base):
    """A lesson being authored. `draft` is the whole lesson bundle as JSON (ADR-0011)."""

    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint("visibility IN ('public', 'students')", name="lessons_visibility_known"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True, nullable=False
    )
    draft: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Set while the lecturer has withdrawn the lesson from students; its versions are kept.
    unpublished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Who sees the published lesson (ADR-0013): "public" = everyone, "students" = only students
    # it is recommended to. A property of the lesson, not of a version: changes apply at once.
    visibility: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="students", default="students"
    )

    versions: Mapped[list["LessonVersion"]] = relationship(
        back_populates="lesson", order_by="LessonVersion.version"
    )


class LessonVersion(Base):
    """A published, immutable lesson version (ADR-0003). A trigger forbids UPDATE and DELETE."""

    __tablename__ = "lesson_versions"
    __table_args__ = (CheckConstraint("version > 0", name="lesson_versions_version_positive"),)

    lesson_id: Mapped[str] = mapped_column(String(100), ForeignKey("lessons.id"), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    bundle: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    lesson: Mapped[Lesson] = relationship(back_populates="versions")
