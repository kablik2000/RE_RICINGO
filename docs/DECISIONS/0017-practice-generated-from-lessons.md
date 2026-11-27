# ADR-0017: Practice generated from lesson content, progress on the device

- Status: **Accepted** (owner decisions 2026-11-27)
- Date: 2026-11-27
- Relates to: ARCHITECTURE §5.2 (exercise type registry), ADR-0003 (content versions),
  ADR-0011 (lesson drafts), ADR-0013 (recommendations: "practice" of a lesson or topic)

## Context

The student app needs practice (spec §9, M5): the owner's sketch shows vocabulary review,
dialogues, listening, grammar and translations, with a "recommended" view. Lessons already hold
everything exercises need — sentences with Czech translations, analysed segments linked to
lexemes and grammar topics, speakers and turns — but no authored exercises. Authoring every
exercise by hand in the Studio would be a lot of work per lesson, and a lesson without authored
exercises would have nothing to practise.

## Decision

1. **Exercises are generated from the lesson** (owner: "automaticky z lekce"), in
   `packages/domain/src/practice`, the same code in the app and the Studio preview:
   - _Opakování slovíček_ — a word and four options, Italian → Czech and back (choice);
   - _Dialogy_ — the other speaker's line; pick the reply (the first sentence of the next turn);
   - _Poslech_ — the app speaks a sentence; pick its Czech meaning;
   - _Gramatika_ — a sentence with a grammar-linked segment left out; pick the form (fill in);
   - _Překlady_ — build the Italian sentence from its segments plus two extra tiles (build).
     Distractors come from the same lesson (same part of speech or grammar topic first) and never
     differ from the answer only in case or punctuation.
2. **Answers by choosing and tiles only** (owner); no typing in v1, so no accent handling yet
   (normalisation keeps accents significant for later typed answers).
3. **The lecturer tunes, not authors:** the Studio lesson editor gets a _Procvičování_ tab with a
   preview of every generated exercise and checkboxes to leave sentences or words out. Stored in
   the lesson bundle as optional `practice: { excludedSentenceIds, excludedLexemeIds }` — an
   additive change, so `contentSchemaVersion` stays 1 and older apps ignore it. Unknown IDs are
   ignored; removing a sentence or word in the Studio also removes it from the lists.
4. **Progress per practised item on the device** (`practice_reviews` in SQLite; key
   `<kind>:<lessonId>:<item id>`, stable across lesson versions). Leitner boxes: right → next box
   (1, 3, 7, 14, 30, 60 days), wrong → back to the start. A session takes 10 items, new and due
   ones first. Each answer is saved when checked. Server-side progress comes with ADR-0013 step 6;
   FSRS may replace the boxes in M10.
5. **Practice home:** _Doporučené_ (each kind across all lessons with what is due) and _Podle
   lekcí_ (kinds per lesson and per grammar topic). A session route
   `/practice/session?kind=…&lessonId=…&topicId=…` is what a lecturer's "practice" recommendation
   opens once Home shows recommendations (ADR-0013 step 5).

## Consequences

- Every lesson can be practised the moment it is published; quality follows the lesson's
  analysis (segments, links to lexemes and topics), which the lecturer already maintains.
- Generated exercises are only as good as their context: e.g. a dialogue reply that is just a
  greeting. The lecturer leaves such sentences out in the preview.
- Exercise types are code, not data: new types (word matching, typed translation) need an app
  update; the registry in ARCHITECTURE §5.2 stays the plan for authored or AI-generated ones.
- Progress is lost with the app's data until it is synced to the server (step 6).
