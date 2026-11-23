"""Lesson content validation (ADR-0010, ADR-0011).

Structure: the JSON Schema generated from the zod schema in `packages/domain`, committed in
`schemas/lesson-bundle.schema.json` (a domain test keeps it current).
Semantics: unique IDs, references and segment order — a port of `validateLessonBundle` in
`packages/domain/src/content/validate-lesson-bundle.ts`; keep both in step.
"""

import json
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from functools import cache
from importlib.resources import files
from typing import Any

from jsonschema import Draft202012Validator

JsonObject = dict[str, Any]


@dataclass(frozen=True)
class SchemaIssue:
    """One problem found in a lesson bundle: where (JSON path) and what."""

    path: str
    message: str


@cache
def _validator() -> Draft202012Validator:
    text = files("rici_api").joinpath("schemas/lesson-bundle.schema.json").read_text("utf-8")
    schema: JsonObject = json.loads(text)
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def validate_lesson_bundle_structure(bundle: object) -> list[SchemaIssue]:
    """All structural problems of `bundle` (empty when it matches the schema), in path order."""
    issues = [
        SchemaIssue(path=error.json_path, message=error.message)
        for error in _validator().iter_errors(bundle)
    ]
    return sorted(issues, key=lambda issue: issue.path)


def _duplicates(values: Iterable[str]) -> list[str]:
    return sorted(value for value, count in Counter(values).items() if count > 1)


def _segment_order_problem(italian: str, segments: list[JsonObject]) -> str | None:
    cursor = 0
    for segment in segments:
        text: str = segment["text"]
        index = italian.find(text, cursor)
        if index == -1:
            return f'segment "{text}" is not found in "{italian}" after position {cursor}'
        cursor = index + len(text)
    return None


def validate_lesson_bundle_semantics(bundle: JsonObject) -> list[SchemaIssue]:
    """Cross-reference checks; call only on a bundle that passed the structural check."""
    lesson: JsonObject = bundle["lesson"]
    turns: list[JsonObject] = lesson["turns"]
    issues: list[SchemaIssue] = []

    speaker_ids = {speaker["id"] for speaker in lesson["speakers"]}
    lexeme_ids = [lexeme["id"] for lexeme in bundle["lexemes"]]
    topic_ids = [topic["id"] for topic in bundle["grammarTopics"]]

    item_ids = [turn["id"] for turn in turns]
    for turn in turns:
        for sentence in turn["sentences"]:
            item_ids.append(sentence["id"])
            item_ids.extend(segment["id"] for segment in sentence["segments"])
    issues += [SchemaIssue("$.lesson", f'duplicate item id "{i}"') for i in _duplicates(item_ids)]
    issues += [
        SchemaIssue("$.lexemes", f'duplicate lexeme id "{i}"') for i in _duplicates(lexeme_ids)
    ]
    issues += [
        SchemaIssue("$.grammarTopics", f'duplicate grammar topic id "{i}"')
        for i in _duplicates(topic_ids)
    ]

    known_lexemes, known_topics = set(lexeme_ids), set(topic_ids)
    for t, turn in enumerate(turns):
        turn_path = f"$.lesson.turns[{t}]"
        if turn["speakerId"] not in speaker_ids:
            issues.append(SchemaIssue(turn_path, f'unknown speaker "{turn["speakerId"]}"'))
        for s, sentence in enumerate(turn["sentences"]):
            sentence_path = f"{turn_path}.sentences[{s}]"
            problem = _segment_order_problem(sentence["italian"], sentence["segments"])
            if problem is not None:
                issues.append(SchemaIssue(sentence_path, problem))
            for g, segment in enumerate(sentence["segments"]):
                segment_path = f"{sentence_path}.segments[{g}]"
                for lexeme_id in segment.get("lexemeIds", []):
                    if lexeme_id not in known_lexemes:
                        issues.append(SchemaIssue(segment_path, f'unknown lexeme "{lexeme_id}"'))
                for topic_id in segment.get("grammarTopicIds", []):
                    if topic_id not in known_topics:
                        issues.append(
                            SchemaIssue(segment_path, f'unknown grammar topic "{topic_id}"')
                        )
    return issues


def validate_lesson_bundle(bundle: object) -> list[SchemaIssue]:
    """Every problem that blocks publishing: structural first, then semantic."""
    structural = validate_lesson_bundle_structure(bundle)
    if structural or not isinstance(bundle, dict):
        return structural
    return validate_lesson_bundle_semantics(bundle)
