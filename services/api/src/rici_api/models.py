"""Database tables (SQLAlchemy 2). Schema changes go through Alembic migrations in `migrations/`."""

from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Lesson(Base):
    """A lesson being authored. `draft` is the whole lesson bundle as JSON (ADR-0011)."""

    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
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
