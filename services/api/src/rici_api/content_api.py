"""Lesson content for the student app, `/api/v1/content/*` (ADR-0013).

Anyone may use the app without an account: this catalog lists the public published lessons of all
organizations, and the app keeps them offline and asks it what is new (Q-18). A signed-in student
sends their session token (`Authorization: Bearer`); the catalog then also lists the lessons their
teachers recommended to them, including lessons for students only. An unknown or ended token is
treated as no token: the app learns that the session ended from `/api/v1/student/me`.
"""

from flask import Blueprint, Response, jsonify
from flask.typing import ResponseReturnValue
from sqlalchemy.orm import Session

from rici_api import lessons, recommendations, student_auth
from rici_api.auth_api import bearer_token
from rici_api.studio_api import SessionFactory

# A published version never changes (database trigger), so clients may cache it for good.
IMMUTABLE_CACHE = "private, max-age=31536000, immutable"


def _recommended(session: Session) -> set[str]:
    """Lessons recommended to the student whose token the request carries (none without one)."""
    token = bearer_token()
    found = student_auth.authenticate(session, token) if token else None
    return recommendations.recommended_lesson_ids(session, found[0].id) if found else set()


def content_blueprint(session_factory: SessionFactory) -> Blueprint:
    content = Blueprint("content", __name__)

    @content.errorhandler(lessons.LessonNotFoundError)
    def not_found(error: lessons.LessonNotFoundError) -> ResponseReturnValue:
        message = f'Published lesson "{error}" does not exist.'
        return jsonify({"error": {"code": "not_found", "message": message}}), 404

    @content.after_request
    def vary_by_student(response: Response) -> Response:
        # Answers depend on the token: shared caches must not mix students' catalogs.
        response.headers["Vary"] = "Authorization"
        return response

    @content.get("/lessons")
    def catalog() -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            published = lessons.list_published(session, _recommended(session))
        return jsonify(
            {
                "lessons": [
                    {
                        "id": lesson.id,
                        "version": lesson.version,
                        "checksum": lesson.checksum,
                        "publishedAt": lesson.published_at.isoformat(),
                        "titleItalian": lesson.title_italian,
                        "titleCzech": lesson.title_czech,
                        "level": lesson.level,
                    }
                    for lesson in published
                ]
            }
        )

    @content.get("/lessons/<lesson_id>/versions/<int:version>")
    def lesson_version(lesson_id: str, version: int) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            published = lessons.get_published_version(
                session, lesson_id, version, _recommended(session)
            )
            body = {
                "lessonId": published.lesson_id,
                "version": published.version,
                "checksum": published.checksum,
                "bundle": published.bundle,
            }
        response = jsonify(body)
        response.headers["Cache-Control"] = IMMUTABLE_CACHE
        return response

    return content
