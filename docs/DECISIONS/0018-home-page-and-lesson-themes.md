# ADR-0018: Home page, lesson themes and the lecturer's recommendations in the app

- Status: **Accepted** (owner's sketch and decisions, 2026-11-27)
- Date: 2026-11-27
- Relates to: ADR-0013 (step 5: "Od vaší lektorky"), ADR-0017 (practice), ADR-0009 (design)

## Context

The Home tab only said that it was being designed. The owner sent a sketch: the greeting over an
Italian illustration, a short invitation, "Procházet sbírku lekcí", rows for _Tematické
okruhy_, _Úrovně_ and _Všechny lekce_, and "Doporučujeme začít" with lesson cards — in the app's
own design. Lessons had a level but no theme, and recommendations were stored on the server but
not shown to students.

## Decision

1. **Lesson themes:** optional `lesson.theme` in the bundle, one of a fixed list (`everyday`,
   `food`, `travel`, `shopping`, `work`, `free-time`, `health`, `culture`; Czech labels in the
   app and the Studio). Chosen in the Studio (_Informace o lekci → Téma_). Additive, so
   `contentSchemaVersion` stays 1; lessons without a theme are listed under "Další lekce".
2. **Home:** the greeting over a Roman skyline with a cappuccino (drawn from the illustration
   colours), the invitation, a button to the Lessons tab, rows to `/browse?by=theme`,
   `/browse?by=level` and the Lessons tab, the lecturer's recommendations, and a horizontal row
   of lessons to start (easiest level first). Formal "vy" as in the rest of the app (Q-17).
3. **"Od vaší lektorky"** for signed-in students: `GET /api/v1/student/recommendations`; the last
   answer is kept on the device and shown offline, and forgotten on sign-out. A lesson opens the
   lesson; practice opens `/practice/session` for the grammar topic or the whole lesson mixed
   (`kind=mixed`); words open vocabulary practice of exactly those words (`words=a,b`).

## Consequences

- A lecturer must set themes in the Studio and publish again for lessons to appear under a theme.
- The list of themes is code; a new theme needs an app and Studio update (older apps would reject
  a lesson with a theme they do not know, so add themes only together with an app release).
- "Doporučujeme začít" has no progress to go by yet (step 6); it offers the easiest lessons.
