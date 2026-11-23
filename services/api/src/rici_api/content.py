"""Lesson content validation against the shared lesson-bundle schema (ADR-0010).

The schema is generated from the zod schema in `packages/domain` and committed in
`schemas/lesson-bundle.schema.json`; a test in the domain package keeps it current. This module
checks the *structure*. Cross-references (speakers, lexemes, grammar topics) and segment order
are checked separately when lessons are published.
"""

import json
from dataclasses import dataclass
from functools import cache
from importlib.resources import files
from typing import Any

from jsonschema import Draft202012Validator


@dataclass(frozen=True)
class SchemaIssue:
    """One problem found in a lesson bundle: where (JSON path) and what."""

    path: str
    message: str


@cache
def _validator() -> Draft202012Validator:
    text = files("rici_api").joinpath("schemas/lesson-bundle.schema.json").read_text("utf-8")
    schema: dict[str, Any] = json.loads(text)
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def validate_lesson_bundle_structure(bundle: object) -> list[SchemaIssue]:
    """All structural problems of `bundle` (empty when it matches the schema), in path order."""
    issues = [
        SchemaIssue(path=error.json_path, message=error.message)
        for error in _validator().iter_errors(bundle)
    ]
    return sorted(issues, key=lambda issue: issue.path)
