# ADR-0013: Public app, invited students, lesson visibility, per-student recommendations

- Status: **Accepted** (product owner decisions, 2026-11-24)
- Date: 2026-11-24
- Supersedes: ADR-0004 context "the app is for the lecturer's clients only" (spec §1) and the
  assumption that every user signs in. Invite-only **accounts**, roles and tenancy stay.
- Answers: Q-5 (distribution) — public store listing.

## Context

The owner expects most users not to be the lecturer's students: the app is for everyone. A
student who signs in should additionally see what their lecturer recommends. Students can be
under 15 (Q-7), and several lecturers/schools use the Studio (Q-2).

## Decision

1. **Anyone can use the app without an account.** Public lessons download and work offline;
   progress stays on the device. No sign-up screen is required to learn.
2. **Accounts only by invitation.** A lecturer invites a student from the Studio; there is no
   public registration. For a student under 15 the lecturer confirms the parents' consent when
   inviting (GDPR, CZ age of digital consent 15); anonymous use needs no consent because nothing
   personal leaves the device.
3. **Lesson visibility, chosen per lesson in the Studio:** _Veřejná_ (everyone, signed in or not)
   or _Jen pro mé studenty_ (only students it was recommended to). Default for new lessons:
   _Jen pro mé studenty_, so nothing becomes public by accident.
4. **One public catalog:** without signing in, the app shows the public lessons of all
   organizations under the RICI brand.
5. **Recommendations per student:** the lecturer recommends lessons and topics (_okruhy_) to
   individual students (no groups for now). A signed-in student sees them on Home in
   "Od vaší lektorky", and recommended private lessons download like public ones.
6. Progress of a signed-in student is stored on the server (multi-device) once progress sync
   exists (M7); a student keeps the anonymous progress made before signing in.

## Consequences

- The student content API becomes public (no auth) for public lessons and authenticated for a
  student's recommendations; it moves out of development-only (needs hosting, Q-19).
- Store listing: the app is usable without an account, so the App Store reviewer needs no demo
  account for the main flow; a demo student account is still needed to review sign-in.
- Privacy: anonymous use collects no personal data; analytics (if any) must stay anonymous.
- Groups of students, public registration and payments can be added later without changing
  this model.
