"""Teacher Studio endpoints `/api/v1/studio/*` (ADR-0011).

Every endpoint needs a signed-in teacher (ADR-0012) and sees only the lessons of the teacher's
organization; another organization's lesson answers 404, like one that does not exist.
"""

import uuid
from collections.abc import Callable

from flask import Blueprint, g, jsonify, request
from flask.typing import ResponseReturnValue
from sqlalchemy.orm import Session

from rici_api import lessons, recommendations, statistics, students
from rici_api.auth import Teacher
from rici_api.auth_api import require_teacher
from rici_api.content import SchemaIssue
from rici_api.mailer import Mailer

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


def _invitation_json(invitation: students.InvitationSummary) -> dict[str, object]:
    return {
        "id": str(invitation.id),
        "email": invitation.email,
        "displayName": invitation.display_name,
        "isMinor": invitation.is_minor,
        "status": invitation.status,
        "sentAt": invitation.sent_at.isoformat(),
        "expiresAt": invitation.expires_at.isoformat(),
    }


def recommendation_json(view: recommendations.RecommendationView) -> dict[str, object]:
    """A recommendation as both the Studio and the student app receive it."""
    return {
        "id": str(view.id),
        "kind": view.kind,
        "teacherName": view.teacher_name,
        "lesson": {
            "id": view.lesson_id,
            "titleItalian": view.lesson_title_italian,
            "titleCzech": view.lesson_title_czech,
            "level": view.lesson_level,
        },
        "grammarTopic": (
            {"id": view.topic.id, "title": view.topic.title} if view.topic is not None else None
        ),
        "words": [
            {"id": word.id, "lemma": word.lemma, "translation": word.translation}
            for word in view.words
        ],
        "note": view.note,
        "createdAt": view.created_at.isoformat(),
        "available": view.available,
    }


def _error(code: str, message: str, status: int, **extra: object) -> ResponseReturnValue:
    return jsonify({"error": {"code": code, "message": message, **extra}}), status


def studio_blueprint(session_factory: SessionFactory, mailer: Mailer) -> Blueprint:
    studio = Blueprint("studio", __name__)
    studio.before_request(require_teacher(session_factory))

    def current_teacher() -> Teacher:
        teacher: Teacher = g.teacher
        return teacher

    def organization() -> uuid.UUID:
        return current_teacher().organization_id

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
            student_count = students.count_students(session, current_teacher())
        return jsonify(
            {
                "lessons": {
                    "total": data.lessons_total,
                    "published": data.lessons_published,
                    "withDraftChanges": data.lessons_with_draft_changes,
                },
                "publishedLexemes": data.published_lexemes,
                "publishedGrammarTopics": data.published_grammar_topics,
                "students": student_count,
            }
        )

    @studio.get("/statistics")
    def get_statistics() -> ResponseReturnValue:
        with session_factory() as session:
            data = statistics.statistics(session, current_teacher())
        return jsonify(
            {
                "lessons": {
                    "byStatus": data.lessons_by_status,
                    "byLevel": data.lessons_by_level,
                    "public": data.public_lessons,
                    "studentsOnly": data.students_only_lessons,
                    "sentences": data.sentences,
                    "publishedLexemes": data.published_lexemes,
                    "publishedGrammarTopics": data.published_grammar_topics,
                },
                "students": {
                    "total": data.students,
                    "minors": data.minors,
                    "activeLast7Days": data.active_last_7_days,
                    "activeLast30Days": data.active_last_30_days,
                },
                "invitations": data.invitations,
                "recommendations": data.recommendations,
                "months": [
                    {
                        "month": month.month,
                        "studentsJoined": month.students_joined,
                        "lessonsPublished": month.lessons_published,
                    }
                    for month in data.months
                ],
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

    @studio.errorhandler(students.InvitationNotFoundError)
    def no_invitation(error: students.InvitationNotFoundError) -> ResponseReturnValue:
        return _error("not_found", "No such invitation or student.", 404)

    @studio.errorhandler(students.InvitationError)
    def bad_invitation(error: students.InvitationError) -> ResponseReturnValue:
        return _error(error.code, str(error), 422)

    @studio.errorhandler(students.DeliveryError)
    def not_delivered(error: students.DeliveryError) -> ResponseReturnValue:
        return _error("mail_failed", "The invitation e-mail could not be sent.", 502)

    @studio.get("/students")
    def list_students() -> ResponseReturnValue:
        with session_factory() as session:
            found, invitations = students.list_students(session, current_teacher())
        return jsonify(
            {
                "students": [
                    {
                        "id": str(student.id),
                        "email": student.email,
                        "displayName": student.display_name,
                        "isMinor": student.is_minor,
                        "since": student.since.isoformat(),
                        "deviceCount": student.device_count,
                    }
                    for student in found
                ],
                "invitations": [_invitation_json(invitation) for invitation in invitations],
            }
        )

    @studio.post("/invitations")
    def invite() -> ResponseReturnValue:
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return _error("validation", "Expected a JSON object.", 422)
        email, name = body.get("email"), body.get("displayName")
        is_minor, consent = body.get("isMinor", False), body.get("parentalConsent", False)
        if not (
            isinstance(email, str)
            and isinstance(name, str)
            and isinstance(is_minor, bool)
            and isinstance(consent, bool)
        ):
            return _error(
                "validation",
                'Expected {"email", "displayName", "isMinor": bool, "parentalConsent": bool}.',
                422,
            )
        with session_factory() as session, session.begin():
            invitation = students.invite(
                session,
                mailer,
                current_teacher(),
                email=email,
                display_name=name,
                is_minor=is_minor,
                parental_consent=consent,
            )
        return jsonify({"invitation": _invitation_json(invitation)}), 201

    @studio.post("/invitations/<uuid:invitation_id>/resend")
    def resend_invitation(invitation_id: uuid.UUID) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            invitation = students.resend(session, mailer, current_teacher(), invitation_id)
        return jsonify({"invitation": _invitation_json(invitation)})

    @studio.delete("/invitations/<uuid:invitation_id>")
    def revoke_invitation(invitation_id: uuid.UUID) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            students.revoke(session, current_teacher(), invitation_id)
        return "", 204

    @studio.delete("/students/<uuid:student_id>/sessions")
    def sign_student_out(student_id: uuid.UUID) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            students.sign_out_everywhere(session, current_teacher(), student_id)
        return "", 204

    @studio.delete("/students/<uuid:student_id>")
    def remove_student(student_id: uuid.UUID) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            students.remove_student(session, current_teacher(), student_id)
        return "", 204

    @studio.errorhandler(recommendations.RecommendationNotFoundError)
    def no_recommendation(
        error: recommendations.RecommendationNotFoundError,
    ) -> ResponseReturnValue:
        return _error("not_found", "No such student or recommendation.", 404)

    @studio.errorhandler(recommendations.RecommendationError)
    def bad_recommendation(error: recommendations.RecommendationError) -> ResponseReturnValue:
        return _error(error.code, str(error), 422)

    @studio.get("/recommendation-options")
    def recommendation_options() -> ResponseReturnValue:
        with session_factory() as session:
            found = recommendations.options(session, organization())
        return jsonify(
            {
                "lessons": [
                    {
                        "id": option.id,
                        "titleItalian": option.title_italian,
                        "titleCzech": option.title_czech,
                        "level": option.level,
                        "visibility": option.visibility,
                        "grammarTopics": [
                            {"id": topic.id, "title": topic.title} for topic in option.topics
                        ],
                        "words": [
                            {"id": word.id, "lemma": word.lemma, "translation": word.translation}
                            for word in option.words
                        ],
                    }
                    for option in found
                ]
            }
        )

    @studio.get("/students/<uuid:student_id>")
    def get_student(student_id: uuid.UUID) -> ResponseReturnValue:
        with session_factory() as session:
            student = recommendations.student_details(session, current_teacher(), student_id)
            found = recommendations.for_teacher(session, current_teacher(), student_id)
            body = {
                "student": {
                    "id": str(student.id),
                    "email": student.email,
                    "displayName": student.display_name,
                    "isMinor": student.is_minor,
                },
                "recommendations": [recommendation_json(view) for view in found],
            }
        return jsonify(body)

    @studio.post("/students/<uuid:student_id>/recommendations")
    def recommend(student_id: uuid.UUID) -> ResponseReturnValue:
        body = request.get_json(silent=True)
        body = body if isinstance(body, dict) else {}
        kind, lesson_id = body.get("kind"), body.get("lessonId")
        topic, words, note = body.get("grammarTopicId"), body.get("wordIds"), body.get("note")
        if not (
            isinstance(kind, str)
            and isinstance(lesson_id, str)
            and (topic is None or isinstance(topic, str))
            and (
                words is None
                or (isinstance(words, list) and all(isinstance(w, str) for w in words))
            )
            and (note is None or isinstance(note, str))
        ):
            return _error(
                "validation",
                'Expected {"kind", "lessonId", "grammarTopicId"?, "wordIds"?: [..], "note"?}.',
                422,
            )
        with session_factory() as session, session.begin():
            view = recommendations.recommend(
                session,
                current_teacher(),
                student_id,
                kind=kind,
                lesson_id=lesson_id,
                grammar_topic_id=topic,
                word_ids=words,
                note=note,
            )
            created = recommendation_json(view)
        return jsonify({"recommendation": created}), 201

    @studio.delete("/students/<uuid:student_id>/recommendations/<uuid:recommendation_id>")
    def remove_recommendation(
        student_id: uuid.UUID, recommendation_id: uuid.UUID
    ) -> ResponseReturnValue:
        with session_factory() as session, session.begin():
            recommendations.remove(session, current_teacher(), student_id, recommendation_id)
        return "", 204

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
