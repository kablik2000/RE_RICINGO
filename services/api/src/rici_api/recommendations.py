"""What a teacher recommends to each of their students (ADR-0013 step 4).

Three kinds: a lesson to go through, practice (of a whole lesson or of one of its grammar topics)
and vocabulary (chosen words of a lesson). A teacher recommends only published lessons of their
own organization, including lessons for students only; the student's app then downloads those
lessons too (`recommended_lesson_ids`). Topics and words are resolved against the lesson's newest
published version, so a recommendation follows the lesson's updates; one whose lesson is
withdrawn, or whose topic or words are gone, is kept for the teacher but hidden from the student.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from rici_api.auth import Teacher
from rici_api.models import Lesson, LessonVersion, Recommendation, TeacherStudent, User

Kind = Literal["lesson", "practice", "vocabulary"]
KINDS: tuple[Kind, ...] = ("lesson", "practice", "vocabulary")
MAX_NOTE_LENGTH = 500
MAX_WORDS = 200
MAX_PER_STUDENT = 200


class RecommendationError(Exception):
    """The recommendation cannot be made as asked. `code` tells clients which case."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class RecommendationNotFoundError(Exception):
    """No such student of this teacher, or no such recommendation."""


@dataclass(frozen=True)
class Topic:
    id: str
    title: str


@dataclass(frozen=True)
class Word:
    id: str
    lemma: str
    translation: str


@dataclass(frozen=True)
class LessonOption:
    """A lesson the teacher can recommend, with what can be chosen from it."""

    id: str
    title_italian: str
    title_czech: str
    level: str
    visibility: str
    topics: list[Topic]
    words: list[Word]


@dataclass(frozen=True)
class RecommendationView:
    id: uuid.UUID
    kind: Kind
    teacher_name: str
    lesson_id: str
    lesson_title_italian: str
    lesson_title_czech: str
    lesson_level: str
    topic: Topic | None
    words: list[Word]
    note: str | None
    created_at: datetime
    # False while the lesson is withdrawn or the chosen topic or words are no longer in it.
    available: bool


def _text(value: object) -> str:
    return value if isinstance(value, str) else ""


def _topics(bundle: dict[str, object]) -> list[Topic]:
    raw = bundle.get("grammarTopics")
    return [
        Topic(id=_text(item.get("id")), title=_text(item.get("title")))
        for item in (raw if isinstance(raw, list) else [])
        if isinstance(item, dict)
    ]


def _words(bundle: dict[str, object]) -> list[Word]:
    raw = bundle.get("lexemes")
    return [
        Word(
            id=_text(item.get("id")),
            lemma=_text(item.get("lemma")),
            translation=_text(item.get("translation")),
        )
        for item in (raw if isinstance(raw, list) else [])
        if isinstance(item, dict)
    ]


def _latest(session: Session, lesson_id: str) -> LessonVersion | None:
    return session.scalars(
        select(LessonVersion)
        .where(LessonVersion.lesson_id == lesson_id)
        .order_by(LessonVersion.version.desc())
        .limit(1)
    ).first()


def _is_live(lesson: Lesson) -> bool:
    return lesson.archived_at is None and lesson.unpublished_at is None


def _option(lesson: Lesson, version: LessonVersion) -> LessonOption:
    body = version.bundle.get("lesson")
    body = body if isinstance(body, dict) else {}
    return LessonOption(
        id=lesson.id,
        title_italian=_text(body.get("titleItalian")),
        title_czech=_text(body.get("titleCzech")),
        level=_text(body.get("level")),
        visibility=lesson.visibility,
        topics=_topics(version.bundle),
        words=_words(version.bundle),
    )


def options(session: Session, organization_id: uuid.UUID) -> list[LessonOption]:
    """The organization's published lessons with their grammar topics and words."""
    found = session.scalars(
        select(Lesson)
        .where(
            Lesson.organization_id == organization_id,
            Lesson.archived_at.is_(None),
            Lesson.unpublished_at.is_(None),
        )
        .order_by(Lesson.created_at, Lesson.id)
    ).all()
    return [
        _option(lesson, version)
        for lesson in found
        if (version := _latest(session, lesson.id)) is not None
    ]


def _require_student(session: Session, teacher: Teacher, student_id: uuid.UUID) -> None:
    if session.get(TeacherStudent, (teacher.id, student_id)) is None:
        raise RecommendationNotFoundError(str(student_id))


def recommend(
    session: Session,
    teacher: Teacher,
    student_id: uuid.UUID,
    kind: str,
    lesson_id: str,
    grammar_topic_id: str | None = None,
    word_ids: list[str] | None = None,
    note: str | None = None,
) -> RecommendationView:
    """Recommends something to the teacher's student; raises RecommendationError when the
    request does not fit the lesson's published content."""
    _require_student(session, teacher, student_id)
    if kind not in KINDS:
        raise RecommendationError("invalid_kind", f"Kind must be one of {', '.join(KINDS)}.")
    lesson = session.get(Lesson, lesson_id)
    version = _latest(session, lesson_id) if lesson is not None else None
    if (
        lesson is None
        or version is None
        or lesson.organization_id != teacher.organization_id
        or not _is_live(lesson)
    ):
        raise RecommendationError("lesson_not_published", "Only published lessons can be chosen.")
    option = _option(lesson, version)

    topic_id = grammar_topic_id or None
    if topic_id is not None and kind != "practice":
        raise RecommendationError("invalid_topic", "Only practice can name a grammar topic.")
    if topic_id is not None and topic_id not in {topic.id for topic in option.topics}:
        raise RecommendationError("unknown_topic", "The lesson has no such grammar topic.")

    chosen: list[str] = []
    if kind == "vocabulary":
        wanted = set(word_ids or [])
        chosen = [word.id for word in option.words if word.id in wanted]
        if not wanted:
            raise RecommendationError("words_required", "Choose at least one word.")
        if len(chosen) != len(wanted):
            raise RecommendationError("unknown_words", "Some words are not in the lesson.")
        if len(chosen) > MAX_WORDS:
            raise RecommendationError("too_many_words", f"At most {MAX_WORDS} words.")
    elif word_ids:
        raise RecommendationError("invalid_words", "Only vocabulary names words.")

    text = (note or "").strip()
    if len(text) > MAX_NOTE_LENGTH:
        raise RecommendationError("note_too_long", f"At most {MAX_NOTE_LENGTH} characters.")

    mine = (
        select(func.count())
        .select_from(Recommendation)
        .where(Recommendation.teacher_id == teacher.id, Recommendation.student_id == student_id)
    )
    if (session.scalar(mine) or 0) >= MAX_PER_STUDENT:
        raise RecommendationError("too_many", f"At most {MAX_PER_STUDENT} per student.")
    if kind != "vocabulary":
        same = mine.where(
            Recommendation.kind == kind,
            Recommendation.lesson_id == lesson_id,
            Recommendation.grammar_topic_id.is_(None)
            if topic_id is None
            else Recommendation.grammar_topic_id == topic_id,
        )
        if session.scalar(same):
            raise RecommendationError("already_recommended", "This is already recommended.")

    recommendation = Recommendation(
        teacher_id=teacher.id,
        student_id=student_id,
        kind=kind,
        lesson_id=lesson_id,
        grammar_topic_id=topic_id,
        lexeme_ids=chosen,
        note=text or None,
    )
    session.add(recommendation)
    session.flush()
    session.refresh(recommendation)
    return _view(recommendation, lesson, version, teacher.display_name)


def remove(
    session: Session, teacher: Teacher, student_id: uuid.UUID, recommendation_id: uuid.UUID
) -> None:
    recommendation = session.get(Recommendation, recommendation_id)
    if (
        recommendation is None
        or recommendation.teacher_id != teacher.id
        or recommendation.student_id != student_id
    ):
        raise RecommendationNotFoundError(str(recommendation_id))
    session.delete(recommendation)
    session.flush()


def _view(
    recommendation: Recommendation,
    lesson: Lesson,
    version: LessonVersion | None,
    teacher_name: str,
) -> RecommendationView:
    option = _option(lesson, version) if version is not None else None
    topics = {topic.id: topic for topic in option.topics} if option else {}
    words = {word.id: word for word in option.words} if option else {}
    topic = topics.get(recommendation.grammar_topic_id or "")
    chosen = [words[word_id] for word_id in recommendation.lexeme_ids if word_id in words]
    kind: Kind = "lesson"
    if recommendation.kind == "practice":
        kind = "practice"
    elif recommendation.kind == "vocabulary":
        kind = "vocabulary"
    available = (
        option is not None
        and _is_live(lesson)
        and (recommendation.grammar_topic_id is None or topic is not None)
        and (kind != "vocabulary" or len(chosen) > 0)
    )
    return RecommendationView(
        id=recommendation.id,
        kind=kind,
        teacher_name=teacher_name,
        lesson_id=lesson.id,
        lesson_title_italian=option.title_italian if option else "",
        lesson_title_czech=option.title_czech if option else "",
        lesson_level=option.level if option else "",
        topic=topic,
        words=chosen,
        note=recommendation.note,
        created_at=recommendation.created_at,
        available=available,
    )


def _views(
    session: Session, query_rows: list[tuple[Recommendation, Lesson, str]]
) -> list[RecommendationView]:
    versions: dict[str, LessonVersion | None] = {}
    views = []
    for recommendation, lesson, teacher_name in query_rows:
        if lesson.id not in versions:
            versions[lesson.id] = _latest(session, lesson.id)
        views.append(_view(recommendation, lesson, versions[lesson.id], teacher_name))
    return views


def for_teacher(
    session: Session, teacher: Teacher, student_id: uuid.UUID
) -> list[RecommendationView]:
    """The teacher's recommendations for one of their students, newest first."""
    _require_student(session, teacher, student_id)
    rows = session.execute(
        select(Recommendation, Lesson)
        .join(Lesson, Lesson.id == Recommendation.lesson_id)
        .where(Recommendation.teacher_id == teacher.id, Recommendation.student_id == student_id)
        .order_by(Recommendation.created_at.desc(), Recommendation.id)
    ).all()
    return _views(session, [(rec, lesson, teacher.display_name) for rec, lesson in rows])


def for_student(session: Session, student_id: uuid.UUID) -> list[RecommendationView]:
    """What the student's teachers recommend that the student can use now, newest first."""
    rows = session.execute(
        select(Recommendation, Lesson, User.display_name)
        .join(Lesson, Lesson.id == Recommendation.lesson_id)
        .join(User, User.id == Recommendation.teacher_id)
        .where(Recommendation.student_id == student_id, User.is_active.is_(True))
        .order_by(Recommendation.created_at.desc(), Recommendation.id)
    ).all()
    views = _views(session, [(rec, lesson, name) for rec, lesson, name in rows])
    return [view for view in views if view.available]


def recommended_lesson_ids(session: Session, student_id: uuid.UUID) -> set[str]:
    """Lessons the student may download because an active teacher recommended them."""
    return set(
        session.scalars(
            select(Recommendation.lesson_id)
            .join(User, User.id == Recommendation.teacher_id)
            .where(Recommendation.student_id == student_id, User.is_active.is_(True))
        ).all()
    )


def student_details(session: Session, teacher: Teacher, student_id: uuid.UUID) -> User:
    """The teacher's active student (for the Studio's student page)."""
    _require_student(session, teacher, student_id)
    student = session.get(User, student_id)
    if student is None or not student.is_active:
        raise RecommendationNotFoundError(str(student_id))
    return student
