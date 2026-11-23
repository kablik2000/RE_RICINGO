# ADR-0011: Lesson drafts stored as validated JSON documents (Studio MVP)

- Status: **Accepted** (2026-11-23, implementing the approved Teacher Studio design)
- Date: 2026-11-23
- Refines: ADR-0003 point 1 ("authoring happens in mutable draft tables")

## Context

The Teacher Studio editor (approved 2026-11-23) edits a whole lesson at once: dialogue, sentence
segments with layered explanations, vocabulary, grammar topics, lesson info, with a live preview.
ADR-0003 planned normalized authoring tables (lesson → turn → sentence → segment …). The student
app consumes the lesson as one bundle validated by the shared schema (ADR-0010).

## Decision

1. A lesson draft is stored as **one JSON document** (`lessons.draft`, PostgreSQL `jsonb`) in the
   exact lesson-bundle shape. Every save is validated by the API with the shared JSON Schema
   (structure); publishing additionally runs the semantic checks (unique IDs, references, segment
   order), ported from `validateLessonBundle`.
2. Publishing copies the draft into an **immutable** `lesson_versions` row (version n + 1, with a
   SHA-256 checksum of the canonical JSON). A database trigger rejects any update or delete of a
   published version (ADR-0003 points 2 and 5 unchanged).
3. Stable item IDs live inside the document as before; students' learning events keep
   referencing `lesson_version` + item ID.
4. Until authentication exists (M2), the Studio endpoints are registered **only in the
   `development` and `test` environments**; they never run on a deployed server without auth.

## Alternatives

- **Normalized authoring tables now** (ADR-0003 as written): more joins, more endpoints and more
  migration work for the same editor; no current need to query inside drafts across lessons.
- **Files in git (content-as-code)** as the Studio's store: needs a developer to publish.

## Consequences

- One endpoint pair (load / save) serves the whole editor; the editor and the app share one shape.
- Cross-lesson queries (e.g. "every lesson using lexeme X") need JSON queries or a normalized
  index later; revisit when the library (shared lexemes and grammar topics across lessons) is
  built.
- Concurrent editing of one lesson by two people is last-write-wins for now (single lecturer).
