"""Lesson authoring: drafts, publishing and summaries for the Teacher Studio (ADR-0011)."""

import copy
import hashlib
import json
import re
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from rici_api.content import JsonObject, SchemaIssue, validate_lesson_bundle
from rici_api.models import Lesson, LessonVersion

LessonStatus = Literal["draft", "published", "changed", "unpublished"]
CONTENT_SCHEMA_VERSION = 1


class LessonNotFoundError(Exception):
    """No lesson with the requested ID."""


class LessonContentError(Exception):
    """The request carries a lesson that cannot be stored or published."""

    def __init__(self, message: str, issues: list[SchemaIssue] | None = None) -> None:
        super().__init__(message)
        self.issues = issues or []


@dataclass(frozen=True)
class LessonSummary:
    id: str
    title_italian: str
    title_czech: str
    level: str
    goal: str
    sentence_count: int
    exchange_count: int
    lexeme_count: int
    grammar_topic_count: int
    status: LessonStatus
    published_version: int | None
    updated_at: datetime


def canonical_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def _without_version(bundle: JsonObject) -> JsonObject:
    """The bundle with `lesson.version` neutralised, to compare content across versions."""
    clone = copy.deepcopy(bundle)
    lesson = clone.get("lesson")
    if isinstance(lesson, dict):
        lesson["version"] = 0
    return clone


def _text(value: object) -> str:
    return value if isinstance(value, str) else ""


def _list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def _summary(lesson: Lesson, latest: LessonVersion | None) -> LessonSummary:
    """Built defensively: drafts may be incomplete while the lecturer is still writing."""
    draft = lesson.draft
    raw_body = draft.get("lesson")
    body: JsonObject = raw_body if isinstance(raw_body, dict) else {}
    turns = _list(body.get("turns"))
    sentences = sum(len(_list(turn.get("sentences"))) for turn in turns if isinstance(turn, dict))
    if latest is None:
        status: LessonStatus = "draft"
    elif lesson.unpublished_at is not None:
        status = "unpublished"
    elif canonical_json(_without_version(draft)) == canonical_json(_without_version(latest.bundle)):
        status = "published"
    else:
        status = "changed"
    return LessonSummary(
        id=lesson.id,
        title_italian=_text(body.get("titleItalian")),
        title_czech=_text(body.get("titleCzech")),
        level=_text(body.get("level")),
        goal=_text(body.get("goal")),
        sentence_count=sentences,
        exchange_count=(len(turns) + 1) // 2,
        lexeme_count=len(_list(draft.get("lexemes"))),
        grammar_topic_count=len(_list(draft.get("grammarTopics"))),
        status=status,
        published_version=latest.version if latest else None,
        updated_at=lesson.updated_at,
    )


def _latest_version(session: Session, lesson_id: str) -> LessonVersion | None:
    return session.scalars(
        select(LessonVersion)
        .where(LessonVersion.lesson_id == lesson_id)
        .order_by(LessonVersion.version.desc())
        .limit(1)
    ).first()


def _get_any(session: Session, lesson_id: str) -> Lesson:
    """A lesson of any organization (the student content API, development only)."""
    lesson = session.get(Lesson, lesson_id)
    if lesson is None or lesson.archived_at is not None:
        raise LessonNotFoundError(lesson_id)
    return lesson


def _get(session: Session, lesson_id: str, organization_id: uuid.UUID) -> Lesson:
    """A lesson of the teacher's organization; another organization's lesson does not exist."""
    lesson = _get_any(session, lesson_id)
    if lesson.organization_id != organization_id:
        raise LessonNotFoundError(lesson_id)
    return lesson


def list_lessons(session: Session, organization_id: uuid.UUID) -> list[LessonSummary]:
    lessons = session.scalars(
        select(Lesson)
        .where(Lesson.archived_at.is_(None), Lesson.organization_id == organization_id)
        .order_by(Lesson.updated_at.desc())
    ).all()
    return [_summary(lesson, _latest_version(session, lesson.id)) for lesson in lessons]


def get_lesson(
    session: Session, lesson_id: str, organization_id: uuid.UUID
) -> tuple[LessonSummary, JsonObject]:
    lesson = _get(session, lesson_id, organization_id)
    return _summary(lesson, _latest_version(session, lesson_id)), lesson.draft


def save_draft(
    session: Session, lesson_id: str, organization_id: uuid.UUID, draft: object
) -> tuple[LessonSummary, list[SchemaIssue]]:
    """Stores the draft even when incomplete; returns what still blocks publishing."""
    if not isinstance(draft, dict) or not isinstance(draft.get("lesson"), dict):
        raise LessonContentError("The draft must be a lesson bundle object.")
    if draft["lesson"].get("id") != lesson_id:
        raise LessonContentError("The draft's lesson.id must match the lesson being saved.")
    lesson = _get(session, lesson_id, organization_id)
    lesson.draft = draft
    lesson.updated_at = datetime.now(UTC)
    session.flush()
    return _summary(lesson, _latest_version(session, lesson_id)), validate_lesson_bundle(draft)


def check_draft(session: Session, lesson_id: str, organization_id: uuid.UUID) -> list[SchemaIssue]:
    return validate_lesson_bundle(_get(session, lesson_id, organization_id).draft)


def _unchanged(draft: JsonObject, version: LessonVersion | None) -> bool:
    return version is not None and canonical_json(_without_version(draft)) == canonical_json(
        _without_version(version.bundle)
    )


def publish(session: Session, lesson_id: str, organization_id: uuid.UUID) -> LessonSummary:
    """Publishes the draft as the next immutable version; refuses a draft with problems.

    An unpublished lesson whose draft has not changed is published again as the same version.
    """
    lesson = _get(session, lesson_id, organization_id)
    issues = validate_lesson_bundle(lesson.draft)
    if issues:
        raise LessonContentError("The lesson has problems that block publishing.", issues)
    latest = _latest_version(session, lesson_id)
    if _unchanged(lesson.draft, latest):
        if lesson.unpublished_at is None:
            raise LessonContentError("Nothing changed since the last published version.")
        lesson.unpublished_at = None
        lesson.updated_at = datetime.now(UTC)
        session.flush()
        return _summary(lesson, latest)
    version = (latest.version if latest else 0) + 1
    bundle = copy.deepcopy(lesson.draft)
    bundle["lesson"]["version"] = version
    lesson.draft = copy.deepcopy(bundle)
    published = LessonVersion(
        lesson_id=lesson_id,
        version=version,
        bundle=bundle,
        checksum=hashlib.sha256(canonical_json(bundle).encode("utf-8")).hexdigest(),
    )
    session.add(published)
    lesson.unpublished_at = None
    session.flush()
    return _summary(lesson, published)


def unpublish(session: Session, lesson_id: str, organization_id: uuid.UUID) -> LessonSummary:
    """Withdraws a published lesson from students; its draft and versions are kept."""
    lesson = _get(session, lesson_id, organization_id)
    latest = _latest_version(session, lesson_id)
    if latest is None:
        raise LessonContentError("The lesson has never been published.")
    if lesson.unpublished_at is not None:
        raise LessonContentError("The lesson is already unpublished.")
    lesson.unpublished_at = lesson.updated_at = datetime.now(UTC)
    session.flush()
    return _summary(lesson, latest)


def delete_lesson(session: Session, lesson_id: str, organization_id: uuid.UUID) -> None:
    """Deletes a lesson from the Studio.

    A draft that was never published is deleted for good. A lesson with published versions must
    be unpublished first; it is then archived, because published versions are immutable (ADR-0003).
    """
    lesson = _get(session, lesson_id, organization_id)
    if _latest_version(session, lesson_id) is None:
        session.delete(lesson)
    elif lesson.unpublished_at is None:
        raise LessonContentError("A published lesson must be unpublished before it is deleted.")
    else:
        lesson.archived_at = datetime.now(UTC)
    session.flush()


def _slug(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug or "lekce"


def create_lesson(
    session: Session,
    organization_id: uuid.UUID,
    title_italian: str,
    title_czech: str,
    level: str,
) -> str:
    """A new, still empty draft; returns its ID (a slug of the Italian title, made unique)."""
    if not title_italian.strip():
        raise LessonContentError("The Italian title is required.")
    base = _slug(title_italian)[:90]
    lesson_id, suffix = base, 2
    while session.get(Lesson, lesson_id) is not None:
        lesson_id, suffix = f"{base}-{suffix}", suffix + 1
    session.add(
        Lesson(
            id=lesson_id,
            organization_id=organization_id,
            draft={
                "contentSchemaVersion": CONTENT_SCHEMA_VERSION,
                "lesson": {
                    "id": lesson_id,
                    "version": 1,
                    "level": level,
                    "titleItalian": title_italian.strip(),
                    "titleCzech": title_czech.strip(),
                    "goal": "",
                    "speakers": [
                        {"id": "speaker-1", "label": "Mluvčí 1"},
                        {"id": "speaker-2", "label": "Mluvčí 2"},
                    ],
                    "turns": [],
                },
                "grammarTopics": [],
                "lexemes": [],
            },
        )
    )
    session.flush()
    return lesson_id


def import_published_bundle(session: Session, bundle: object, organization_id: uuid.UUID) -> str:
    """Imports a complete bundle as a lesson with a published version (demo seed, import)."""
    issues = validate_lesson_bundle(bundle)
    if issues or not isinstance(bundle, dict):
        raise LessonContentError("The imported lesson is not valid.", issues)
    lesson_id: str = bundle["lesson"]["id"]
    if session.get(Lesson, lesson_id) is not None:
        raise LessonContentError(f'A lesson with id "{lesson_id}" already exists.')
    session.add(Lesson(id=lesson_id, organization_id=organization_id, draft=copy.deepcopy(bundle)))
    session.flush()
    session.add(
        LessonVersion(
            lesson_id=lesson_id,
            version=int(bundle["lesson"]["version"]),
            bundle=copy.deepcopy(bundle),
            checksum=hashlib.sha256(canonical_json(bundle).encode("utf-8")).hexdigest(),
        )
    )
    session.flush()
    return lesson_id


@dataclass(frozen=True)
class PublishedLesson:
    """The newest published version of a lesson, as the student app's catalog lists it."""

    id: str
    version: int
    checksum: str
    published_at: datetime
    title_italian: str
    title_czech: str
    level: str


def list_published(session: Session) -> list[PublishedLesson]:
    """Newest version of every published lesson that is not unpublished or archived."""
    lessons = session.scalars(
        select(Lesson)
        .where(Lesson.archived_at.is_(None), Lesson.unpublished_at.is_(None))
        .order_by(Lesson.created_at, Lesson.id)
    ).all()
    catalog = []
    for lesson in lessons:
        latest = _latest_version(session, lesson.id)
        if latest is None:
            continue
        body = latest.bundle["lesson"]
        catalog.append(
            PublishedLesson(
                id=lesson.id,
                version=latest.version,
                checksum=latest.checksum,
                published_at=latest.published_at,
                title_italian=_text(body.get("titleItalian")),
                title_czech=_text(body.get("titleCzech")),
                level=_text(body.get("level")),
            )
        )
    return catalog


def get_published_version(session: Session, lesson_id: str, version: int) -> LessonVersion:
    """One published version; unpublished and archived lessons are no longer served."""
    if _get_any(session, lesson_id).unpublished_at is not None:
        raise LessonNotFoundError(lesson_id)
    published = session.get(LessonVersion, (lesson_id, version))
    if published is None:
        raise LessonNotFoundError(f"{lesson_id} v{version}")
    return published


@dataclass(frozen=True)
class Overview:
    lessons_total: int
    lessons_published: int
    lessons_with_draft_changes: int
    published_lexemes: int
    published_grammar_topics: int


def overview(session: Session, organization_id: uuid.UUID) -> Overview:
    summaries = list_lessons(session, organization_id)
    live = [summary for summary in summaries if summary.status in ("published", "changed")]
    latest_versions = [
        version for summary in live if (version := _latest_version(session, summary.id)) is not None
    ]
    return Overview(
        lessons_total=len(summaries),
        lessons_published=len(live),
        lessons_with_draft_changes=sum(1 for s in summaries if s.status in ("draft", "changed")),
        published_lexemes=sum(len(_list(v.bundle.get("lexemes"))) for v in latest_versions),
        published_grammar_topics=sum(
            len(_list(v.bundle.get("grammarTopics"))) for v in latest_versions
        ),
    )
