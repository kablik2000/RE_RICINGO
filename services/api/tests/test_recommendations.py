"""Recommendations per student (ADR-0013 step 4): Studio, student app and the content catalog."""

import uuid
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session

from rici_api import lessons
from rici_api.auth import Teacher
from rici_api.models import Recommendation

from .conftest import (
    RecordingMailer,
    create_teacher,
    demo_bundle,
    import_demo,
    sign_in,
)
from .test_student_auth import accept, bearer, invited_code


@pytest.fixture
def student(client: FlaskClient, studio_app: Flask, mailbox: RecordingMailer) -> dict[str, Any]:
    """The teacher's student, signed in in the app: its ID and the app's headers."""
    response = accept(studio_app.test_client(), invited_code(client, mailbox))
    assert response.status_code == 200
    return {"id": response.get_json()["student"]["id"], "headers": bearer(response)}


def recommend(client: FlaskClient, student_id: str, **body: object) -> Any:
    return client.post(f"/api/v1/studio/students/{student_id}/recommendations", json=body)


def app_recommendations(studio_app: Flask, student: dict[str, Any]) -> list[dict[str, Any]]:
    response = studio_app.test_client().get(
        "/api/v1/student/recommendations", headers=student["headers"]
    )
    assert response.status_code == 200
    items: list[dict[str, Any]] = response.get_json()["recommendations"]
    return items


def catalog_ids(studio_app: Flask, headers: dict[str, str] | None = None) -> list[str]:
    response = studio_app.test_client().get("/api/v1/content/lessons", headers=headers or {})
    return [lesson["id"] for lesson in response.get_json()["lessons"]]


def test_options_list_published_lessons_with_topics_and_words(
    client: FlaskClient, engine: Engine, teacher: Teacher
) -> None:
    import_demo(engine, visibility="students")
    with Session(engine) as session, session.begin():
        lessons.create_lesson(session, teacher.organization_id, "Bozza", "Koncept", "A1")

    [option] = client.get("/api/v1/studio/recommendation-options").get_json()["lessons"]

    assert (option["id"], option["visibility"]) == ("al-bar", "students")
    assert {"id": "conditional-vorrei", "title": option["grammarTopics"][2]["title"]} in option[
        "grammarTopics"
    ]
    assert option["words"][0] == {
        "id": "buongiorno",
        "lemma": "buongiorno",
        "translation": option["words"][0]["translation"],
    }


def test_the_teacher_recommends_a_lesson_practice_and_words(
    client: FlaskClient, studio_app: Flask, engine: Engine, student: dict[str, Any]
) -> None:
    import_demo(engine, visibility="students")

    lesson = recommend(client, student["id"], kind="lesson", lessonId="al-bar", note="Do pátku")
    practice = recommend(
        client, student["id"], kind="practice", lessonId="al-bar", grammarTopicId="formal-lei"
    )
    words = recommend(
        client,
        student["id"],
        kind="vocabulary",
        lessonId="al-bar",
        wordIds=["volere", "buongiorno"],
    )

    assert [r.status_code for r in (lesson, practice, words)] == [201, 201, 201]
    # Words come in the lesson's order.
    assert [w["id"] for w in words.get_json()["recommendation"]["words"]] == [
        "buongiorno",
        "volere",
    ]
    detail = client.get(f"/api/v1/studio/students/{student['id']}").get_json()
    assert detail["student"]["email"] == "marie@example.test"
    assert [r["kind"] for r in detail["recommendations"]] == ["vocabulary", "practice", "lesson"]
    seen = app_recommendations(studio_app, student)
    assert [r["kind"] for r in seen] == ["vocabulary", "practice", "lesson"]
    assert seen[1]["grammarTopic"]["id"] == "formal-lei"
    assert (seen[2]["note"], seen[2]["teacherName"]) == ("Do pátku", "Lektorka")
    assert seen[2]["lesson"]["titleItalian"] == demo_bundle()["lesson"]["titleItalian"]


@pytest.mark.parametrize(
    ("body", "code"),
    [
        ({"kind": "homework", "lessonId": "al-bar"}, "invalid_kind"),
        ({"kind": "lesson", "lessonId": "nope"}, "lesson_not_published"),
        ({"kind": "lesson", "lessonId": "al-bar", "grammarTopicId": "formal-lei"}, "invalid_topic"),
        ({"kind": "practice", "lessonId": "al-bar", "grammarTopicId": "nope"}, "unknown_topic"),
        ({"kind": "vocabulary", "lessonId": "al-bar", "wordIds": []}, "words_required"),
        ({"kind": "vocabulary", "lessonId": "al-bar", "wordIds": ["nope"]}, "unknown_words"),
        ({"kind": "practice", "lessonId": "al-bar", "wordIds": ["volere"]}, "invalid_words"),
        ({"kind": "lesson", "lessonId": "al-bar", "note": "x" * 501}, "note_too_long"),
    ],
)
def test_requests_that_do_not_fit_the_lesson_are_refused(
    client: FlaskClient, engine: Engine, student: dict[str, Any], body: dict[str, Any], code: str
) -> None:
    import_demo(engine)

    response = recommend(client, student["id"], **body)

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == code


def test_the_same_lesson_or_practice_is_recommended_once(
    client: FlaskClient, engine: Engine, student: dict[str, Any]
) -> None:
    import_demo(engine)
    assert recommend(client, student["id"], kind="lesson", lessonId="al-bar").status_code == 201
    assert recommend(client, student["id"], kind="practice", lessonId="al-bar").status_code == 201

    again = recommend(client, student["id"], kind="practice", lessonId="al-bar")

    assert again.get_json()["error"]["code"] == "already_recommended"


def test_unpublished_lessons_and_other_organizations_cannot_be_recommended(
    client: FlaskClient, engine: Engine, student: dict[str, Any]
) -> None:
    import_demo(engine, organization="Jiná škola")
    assert (
        recommend(client, student["id"], kind="lesson", lessonId="al-bar").get_json()["error"][
            "code"
        ]
        == "lesson_not_published"
    )
    assert client.get("/api/v1/studio/recommendation-options").get_json()["lessons"] == []


def test_only_the_teachers_own_students_get_recommendations(
    client: FlaskClient, studio_app: Flask, engine: Engine, student: dict[str, Any]
) -> None:
    import_demo(engine)
    create_teacher(engine, "druha@example.test")
    other = studio_app.test_client()
    sign_in(other, "druha@example.test")

    assert recommend(other, student["id"], kind="lesson", lessonId="al-bar").status_code == 404
    assert other.get(f"/api/v1/studio/students/{student['id']}").status_code == 404
    assert recommend(client, str(uuid.uuid4()), kind="lesson", lessonId="al-bar").status_code == (
        404
    )


def test_a_recommended_private_lesson_joins_the_students_catalog(
    client: FlaskClient, studio_app: Flask, engine: Engine, student: dict[str, Any]
) -> None:
    import_demo(engine, visibility="students")
    version = "/api/v1/content/lessons/al-bar/versions/1"
    assert catalog_ids(studio_app) == []
    assert catalog_ids(studio_app, student["headers"]) == []

    recommend(client, student["id"], kind="vocabulary", lessonId="al-bar", wordIds=["volere"])

    assert catalog_ids(studio_app, student["headers"]) == ["al-bar"]
    app = studio_app.test_client()
    assert app.get(version, headers=student["headers"]).status_code == 200
    assert app.get(version).status_code == 404
    assert catalog_ids(studio_app, {"Authorization": "Bearer unknown"}) == []
    assert app.get("/api/v1/content/lessons").headers["Vary"] == "Authorization"


def test_a_withdrawn_lesson_hides_its_recommendations_from_the_student(
    client: FlaskClient, studio_app: Flask, engine: Engine, student: dict[str, Any]
) -> None:
    import_demo(engine, visibility="students")
    recommend(client, student["id"], kind="lesson", lessonId="al-bar")

    assert client.post("/api/v1/studio/lessons/al-bar/unpublish").status_code == 200

    assert app_recommendations(studio_app, student) == []
    assert catalog_ids(studio_app, student["headers"]) == []
    [kept] = client.get(f"/api/v1/studio/students/{student['id']}").get_json()["recommendations"]
    assert kept["available"] is False


def test_removing_a_recommendation_or_the_student(
    client: FlaskClient, studio_app: Flask, engine: Engine, student: dict[str, Any]
) -> None:
    import_demo(engine)
    first = recommend(client, student["id"], kind="lesson", lessonId="al-bar").get_json()
    recommend(client, student["id"], kind="practice", lessonId="al-bar")
    path = f"/api/v1/studio/students/{student['id']}/recommendations"

    assert client.delete(f"{path}/{first['recommendation']['id']}").status_code == 204
    assert client.delete(f"{path}/{first['recommendation']['id']}").status_code == 404
    assert [r["kind"] for r in app_recommendations(studio_app, student)] == ["practice"]

    assert client.delete(f"/api/v1/studio/students/{student['id']}").status_code == 204
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Recommendation)) == 0


def test_the_app_needs_a_session_for_recommendations(anonymous_client: FlaskClient) -> None:
    response = anonymous_client.get("/api/v1/student/recommendations")
    assert response.status_code == 401
