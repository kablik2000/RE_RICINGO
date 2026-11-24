"""Teacher Studio endpoints `/api/v1/studio/*` (ADR-0011).

Every endpoint needs a signed-in teacher (ADR-0012) and sees only the lessons of the teacher's
organization; another organization's lesson answers 404, like one that does not exist.
"""

import uuid
from collections.abc import Callable

from flask import Blueprint, g, jsonify, request
from flask.typing import ResponseReturnValue
from sqlalchemy.orm import Session

from rici_api import lessons
from rici_api.auth import Teacher
from rici_api.auth_api import require_teacher
from rici_api.content import SchemaIssue

SessionFactory = Callable[[], Session]
LEVELS = ("A1", "A2", "B1", "B2", "C1", "C2")


def _summary_json(summary: lessons.LessonSummary) -> dict[str, object]:
    return {
        "id": summary.id,
        "titleItalian": summary.title_italian,
        "titleCzech": summary.title_czech,
        "level": summary.level,
        "goal": summary.goal,
        "sentenceCount": summary.sentence_count,
        "exchangeCount": summary.exchange_count,
        "lexemeCount": summary.lexeme_count,
        "grammarTopicCount": summary.grammar_topic_count,
        "status": summary.status,
        "publishedVersion": summary.published_version,
        "visibility": summary.visibility,
        "updatedAt": summary.updated_at.isoformat(),
    }


def _issues_json(issues: list[SchemaIssue]) -> list[dict[str, str]]:
    return [{"path": issue.path, "message": issue.message} for issue in issues]


def _error(code: str, message: str, status: int, **extra: object) -> ResponseReturnValue:
    return jsonify({"error": {"code": code, "message": message, **extra}}), status


def studio_blueprint(session_factory: SessionFactory) -> Blueprint:
    studio = Blueprint("studio", __name__)
    studio.before_request(require_teacher(session_factory))

    def organization() -> uuid.UUID:
        teacher: Teacher = g.teacher
        return teacher.organization_id

    @studio.errorhandler(lessons.LessonNotFoundError)
    def not_found(error: lessons.LessonNotFoundError) -> ResponseReturnValue:
        return _error("not_found", f'Lesson "{error}" does not exist.', 404)

    @studio.errorhandler(lessons.LessonContentError)
    def invalid(error: lessons.LessonContentError) -> ResponseReturnValue:
        return _error("validation", str(error), 422, issues=_issues_json(error.issues))

    @studio.get("/overview")
    def overview() -> ResponseReturnValue:
        with session_factory() as session:
            data = lessons.overview(session, organization())
        return jsonify(
            {
                "lessons": {
                    "total": data.lessons_total,
                    "published": data.lessons_published,
                    "withDraftChanges": data.lessons_with_draft_changes,
                },
                "publishedLexemes": data.published_lexemes,
                "publishedGrammarTopics": data.published_grammar_topics,
                # Students arrive with authentication and invitations (M2).
                "students": 0,
            }
        )

    @studio.get("/lessons")
    def list_lessons() -> ResponseReturnValue:
        with session_factory() as session:
            summaries = lessons.list_lessons(session, organization())
        return jsonify({"lessons": [_summary_json(summary) for summary in summaries]})

    @studio.post("/lessons")
    def create_lesson() -> ResponseReturnValue:
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return _error("validation", "Expected a JSON object.", 422)
        level = body.get("level", "A1")
        if level not in LEVELS:
            return _error("validation", f"Level must be one of {', '.join(LEVELS)}.", 422)
        with session_factory() as session, session.begin():
            lesson_id = lessons.create_lesson(
                session,
                organization(),
                title_italian=str(body.get("titleItalian", "")),
                title_czech=str(body.get("titleCzech", "")),
                level=level,
            )
        return jsonify({"id": lesson_id}), 201

    @studio.get("/lessons/<lesson_id>")
    def get_lesson(lesson_id: str) -> ResponseReturnValue:
        with session_factory() as session:
            summary, draft = lessons.get_lesson(session, lesson_id, organization())
            issues = lessons.check_draft(session, lesson_id, organization())
        return jsonify(
            {"lesson": _summary_json(summary), "draft": draft, "issues": _issues_json(issues)}
        )

    @studio.put("/lessons/<lesson_id>")
    def save_lesson(lesson_id: str) -> ResponseReturnValue:
        body = request.get_json(silent=True)
        if not isinstance(body, dict) or "draft" not in body:
            return _error("validation", 'Expected {"draft": <lesson bundle>}.', 422)
        with session_factory() as session, session.begin():
            summary, issues = lessons.save_draft(session, lesson_id, organization(), body["draft"])
        return jsonify({"lesson": _summary_json(summary), "issues": _issues_json(issues)})

    @studio.post("/lessons/<lesson_id>/publish")
    def publish_lesson(lesson_id: str) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            summary = lessons.publish(session, lesson_id, organization())
        return jsonify({"lesson": _summary_json(summary)})

    @studio.put("/lessons/<lesson_id>/visibility")
    def set_visibility(lesson_id: str) -> ResponseReturnValue:
        body = request.get_json(silent=True)
        visibility = body.get("visibility") if isinstance(body, dict) else None
        if not isinstance(visibility, str):
            return _error("validation", 'Expected {"visibility": "public" | "students"}.', 422)
        with session_factory() as session, session.begin():
            summary = lessons.set_visibility(session, lesson_id, organization(), visibility)
        return jsonify({"lesson": _summary_json(summary)})

    @studio.delete("/lessons/<lesson_id>")
    def delete_lesson(lesson_id: str) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            lessons.delete_lesson(session, lesson_id, organization())
        return "", 204

    @studio.post("/lessons/<lesson_id>/unpublish")
    def unpublish_lesson(lesson_id: str) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            summary = lessons.unpublish(session, lesson_id, organization())
        return jsonify({"lesson": _summary_json(summary)})

    return studio
