# ADR-0009: Visual design v1 — Material 3, typefaces, icons, artwork

- Status: **Accepted** (design mockup approved by the owner 2026-11-23)
- Date: 2026-11-23

## Context

The M1 screens used system fonts, text-only buttons and no imagery; the owner found the app
"raw" and asked for a professional, clean Material Design look with pictures. A four-screen
mockup (lessons, lesson intro, sentence study, vocabulary) was approved before implementation.

## Decision

- **Material Design 3 structure** on our own design system (ADR-0007): tonal surfaces, rounded
  cards (16–28 dp), filled / tonal / outlined buttons with icons, filter chips, list rows,
  search bar, navigation bar with an active indicator. Brand red and warm neutrals stay
  (provisional until Q-10).
- **Typefaces:** Roboto for the interface, Noto Serif for Italian content (titles, sentences,
  words) and Czech translations in serif italic. Both are open-licence Google Fonts bundled
  through `@expo-google-fonts/*` and loaded at startup while the splash screen stays visible.
  One family name per weight, because Android cannot select weights of custom fonts.
- **Icons:** one `Icon` component with a curated semantic name set, rendered with
  `expo-symbols` — Material Symbols (font) on Android and web, SF Symbols on iOS. No emoji or
  text glyphs as icons.
- **Artwork:** vector scenes (`react-native-svg`) drawn only from theme `illustration` colours,
  so they follow dark mode and the future brand palette. Demo: a café scene for "Al bar" and a
  book as the fallback; per-lesson artwork moves into lesson content with M3.
- **Sentence study** shows the sentence with tappable words and one analysis panel for the
  selected word (instead of a card per segment), with fixed previous / next controls.
- **No fake progress:** the mockup's "continue, sentence 4 of 12" needs progress tracking (M7);
  until then the home card offers the first lesson.

## Alternatives

- **React Native Paper / Material You components:** generic look, harder to give the reading
  experience its own identity (rejected in ADR-0007).
- **Icon font from `@expo/vector-icons`:** older Material Icons set, no SF Symbols on iOS.
- **Bitmap illustrations:** heavier, no dark mode, need an illustrator for every lesson now.

## Consequences

- `react-native-svg` is a native dependency: development builds must be rebuilt (done).
- Fonts add ~1.5 MB to the app; acceptable for the reading quality they bring.
- New lessons need artwork (vector scene or a commissioned illustration) or use the fallback.
