import copy
import json
from pathlib import Path
from typing import Any

from rici_api.content import validate_lesson_bundle_structure

DEMO_LESSON = (
    Path(__file__).resolve().parents[3]
    / "apps"
    / "mobile"
    / "src"
    / "data"
    / "demo"
    / "al-bar.lesson.json"
)


def demo_bundle() -> dict[str, Any]:
    bundle: dict[str, Any] = json.loads(DEMO_LESSON.read_text("utf-8"))
    return bundle


def test_the_demo_lesson_matches_the_shared_schema() -> None:
    assert validate_lesson_bundle_structure(demo_bundle()) == []


def test_reports_where_a_bundle_is_wrong() -> None:
    bundle = copy.deepcopy(demo_bundle())
    bundle["lesson"]["level"] = "Z9"
    del bundle["lesson"]["turns"][0]["sentences"][0]["czech"]

    issues = validate_lesson_bundle_structure(bundle)

    assert [issue.path for issue in issues] == [
        "$.lesson.level",
        "$.lesson.turns[0].sentences[0]",
    ]
    assert "'czech' is a required property" in issues[1].message


def test_rejects_ids_that_are_not_kebab_case() -> None:
    bundle = copy.deepcopy(demo_bundle())
    bundle["lesson"]["id"] = "Al Bar"

    assert [issue.path for issue in validate_lesson_bundle_structure(bundle)] == ["$.lesson.id"]
