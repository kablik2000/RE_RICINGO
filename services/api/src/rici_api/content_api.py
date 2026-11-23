"""Published lesson content for the student app, `/api/v1/content/*`.

The app keeps lessons offline and asks this catalog what is new (DEVELOPMENT_PLAN M7, Q-18).
Until authentication and assignments exist (M2), every published lesson is listed and
`create_app` registers this blueprint only where the Studio endpoints run.
"""

from flask import Blueprint, jsonify
from flask.typing import ResponseReturnValue

from rici_api import lessons
from rici_api.studio_api import SessionFactory

# A published version never changes (database trigger), so clients may cache it for good.
IMMUTABLE_CACHE = "private, max-age=31536000, immutable"


def content_blueprint(session_factory: SessionFactory) -> Blueprint:
    content = Blueprint("content", __name__)

    @content.errorhandler(lessons.LessonNotFoundError)
    def not_found(error: lessons.LessonNotFoundError) -> ResponseReturnValue:
        message = f'Published lesson "{error}" does not exist.'
        return jsonify({"error": {"code": "not_found", "message": message}}), 404

    @content.get("/lessons")
    def catalog() -> ResponseReturnValue:
        with session_factory() as session:
            published = lessons.list_published(session)
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
        with session_factory() as session:
            published = lessons.get_published_version(session, lesson_id, version)
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
