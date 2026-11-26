"""Numbers for the Studio's statistics page.

Lessons are counted for the teacher's organization (like the rest of the Studio), students,
invitations and recommendations for the teacher. Learning results (finished lessons, mistakes)
are not here: the app does not send progress to the server yet.
Months are calendar months in UTC.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from rici_api import lessons
from rici_api.auth import Teacher
from rici_api.models import (
    AuthSession,
    Invitation,
    Lesson,
    LessonVersion,
    Recommendation,
    TeacherStudent,
    User,
)

LEVELS = ("A1", "A2", "B1", "B2", "C1", "C2")
STATUSES: tuple[lessons.LessonStatus, ...] = ("draft", "published", "changed", "unpublished")
MONTHS = 12


@dataclass(frozen=True)
class MonthActivity:
    month: str  # "2026-11"
    students_joined: int
    lessons_published: int  # published versions, a republished lesson counts again


@dataclass(frozen=True)
class Statistics:
    lessons_by_status: dict[str, int]
    lessons_by_level: dict[str, int]
    public_lessons: int
    students_only_lessons: int
    sentences: int
    published_lexemes: int
    published_grammar_topics: int
    students: int
    minors: int
    active_last_7_days: int
    active_last_30_days: int
    invitations: dict[str, int]
    recommendations: int
    months: list[MonthActivity]


def _month_keys(now: datetime) -> list[str]:
    """The last MONTHS calendar months, oldest first, ending with the current one."""
    year, month = now.year, now.month
    keys: list[str] = []
    for _ in range(MONTHS):
        keys.append(f"{year:04d}-{month:02d}")
        year, month = (year, month - 1) if month > 1 else (year - 1, 12)
    return keys[::-1]


def _per_month(times: list[datetime], keys: list[str]) -> dict[str, int]:
    counts = dict.fromkeys(keys, 0)
    for time in times:
        key = time.astimezone(UTC).strftime("%Y-%m")
        if key in counts:
            counts[key] += 1
    return counts


def _active_students(session: Session, student_ids: list[uuid.UUID], since: datetime) -> int:
    """Students with a session used since `since` (the app signed in and talked to the API)."""
    if not student_ids:
        return 0
    return (
        session.scalar(
            select(func.count(func.distinct(AuthSession.user_id))).where(
                AuthSession.user_id.in_(student_ids), AuthSession.last_seen_at >= since
            )
        )
        or 0
    )


def _invitations(session: Session, teacher: Teacher, now: datetime) -> dict[str, int]:
    counts = {"pending": 0, "expired": 0, "accepted": 0, "revoked": 0}
    for accepted_at, revoked_at, expires_at in session.execute(
        select(Invitation.accepted_at, Invitation.revoked_at, Invitation.expires_at).where(
            Invitation.teacher_id == teacher.id
        )
    ):
        if accepted_at is not None:
            counts["accepted"] += 1
        elif revoked_at is not None:
            counts["revoked"] += 1
        elif expires_at <= now:
            counts["expired"] += 1
        else:
            counts["pending"] += 1
    return counts


def statistics(session: Session, teacher: Teacher, now: datetime | None = None) -> Statistics:
    now = now or datetime.now(UTC)
    summaries = lessons.list_lessons(session, teacher.organization_id)
    overview = lessons.overview(session, teacher.organization_id)

    students = list(
        session.execute(
            select(User.id, User.is_minor, TeacherStudent.created_at)
            .join(TeacherStudent, TeacherStudent.student_id == User.id)
            .where(TeacherStudent.teacher_id == teacher.id, User.is_active.is_(True))
        )
    )
    student_ids = [student_id for student_id, _, _ in students]

    keys = _month_keys(now)
    joined = _per_month([created_at for _, _, created_at in students], keys)
    published = _per_month(
        list(
            session.scalars(
                select(LessonVersion.published_at)
                .join(Lesson, Lesson.id == LessonVersion.lesson_id)
                .where(Lesson.organization_id == teacher.organization_id)
            )
        ),
        keys,
    )

    return Statistics(
        lessons_by_status={s: sum(1 for x in summaries if x.status == s) for s in STATUSES},
        lessons_by_level={level: sum(1 for x in summaries if x.level == level) for level in LEVELS},
        public_lessons=sum(1 for x in summaries if x.visibility == "public"),
        students_only_lessons=sum(1 for x in summaries if x.visibility == "students"),
        sentences=sum(x.sentence_count for x in summaries),
        published_lexemes=overview.published_lexemes,
        published_grammar_topics=overview.published_grammar_topics,
        students=len(students),
        minors=sum(1 for _, is_minor, _ in students if is_minor),
        active_last_7_days=_active_students(session, student_ids, now - timedelta(days=7)),
        active_last_30_days=_active_students(session, student_ids, now - timedelta(days=30)),
        invitations=_invitations(session, teacher, now),
        recommendations=session.scalar(
            select(func.count())
            .select_from(Recommendation)
            .where(Recommendation.teacher_id == teacher.id)
        )
        or 0,
        months=[
            MonthActivity(month=key, students_joined=joined[key], lessons_published=published[key])
            for key in keys
        ],
    )
