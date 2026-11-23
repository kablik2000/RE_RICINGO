# ADR-0008: Local Expo native modules for missing device APIs

- Status: **Accepted** (2026-11-23, implementing the owner's request for a one-tap Italian voice download)
- Date: 2026-11-23

## Context

The demo pronounces Italian with the device's text-to-speech voice (`expo-speech`). On Android,
`expo-speech` cannot tell whether a language's voice is actually downloaded (its voice list also
contains voices that are not installed, and speaking silently falls back to the device language),
and no Expo package opens the engine's voice download screen. Both need about 50 lines of Kotlin
against `android.speech.tts.TextToSpeech`.

## Decision

- Small device capabilities that no maintained Expo/community package provides are written as
  **local Expo modules** in `apps/mobile/modules/<name>/` (Expo Modules API, Kotlin/Swift), linked
  by Expo autolinking. First one: `tts-voice-data` (Android only).
- The TypeScript side lives in the owning feature (`src/features/audio/voice-availability.ts`),
  loads the module with `requireOptionalNativeModule`, and degrades to "unknown" when the module is
  absent (Expo Go, web, an older build) — the app never crashes for lack of native code.
- Native logic stays thin and is wrapped behind an injectable TypeScript interface so the
  behaviour is unit-tested without a device.
- No `ios/` / `android/` edits (Continuous Native Generation). Adding or changing a module
  requires a new development build.

## Alternatives

- **`expo-intent-launcher`** to open the installer: covers only half (no availability check).
- **Fork or patch `expo-speech`**: patches drift with every SDK upgrade.
- **Do nothing until recorded/cloud audio (Q-3)**: leaves a wrong, English-accented pronunciation
  in the demo.

## Consequences

- Native code to maintain on SDK upgrades (Expo Modules API is stable across SDKs).
- When a module moves to another app (Studio) it becomes a workspace package instead.
- `tts-voice-data` becomes unnecessary once pronunciation uses recorded/cloud audio (Q-3).
