# ADR-0016: Android app as a direct APK download until the stores

- Status: **Accepted** (owner request 2026-11-26)
- Date: 2026-11-26
- Relates to: ADR-0005 (EAS Build/Update, store release), ADR-0015 (VPS)

## Context

The owner wants students to install the app now, before it is in Google Play or the App Store.
Android allows installing an APK from the web (the user allows the browser to install apps);
iOS does not allow installing from a web page outside the App Store, TestFlight or registered
test devices, all of which need a paid Apple Developer account.

## Decision

1. **Android: a signed release APK** is offered at `https://rici.esprog.eu/app` — a static page
   (`deploy/www/app/`) and the file `italstina-rici.apk`, served by Caddy on the VPS
   (`handle_path /app/*`, `/srv/www/rici-app`). The page explains how to allow the install.
2. **One release key, forever:** RSA 4096 keystore outside the repository
   (`%USERPROFILE%\.android-keys\rici-release.jks`, passwords in the user's
   `~/.gradle/gradle.properties`). The config plugin `with-android-release-signing` uses it for
   release builds; without it a release build falls back to the debug key (local testing only).
   The same key will become the Play upload/app signing key, so installed apps keep updating.
3. **Application ID `eu.esprog.rici`** (the owner's domain), fixed from now on.
4. **Builds are local** (`apps/mobile/scripts/build-release-apk.ps1`: production env, API
   `https://api.rici.esprog.eu`), not EAS, until there is an Expo/Apple account decision.
5. **iPhone:** the page says "Připravujeme"; iOS needs TestFlight/App Store (Q-9, Q-16).
6. Brand for the icon and the page: italstinarici.cz (red `#D2454B`, beige, Merriweather,
   self-hosted on the page — no Google Fonts requests from visitors).

## Consequences

- Updates are manual: students download the new APK and install it over the old one; the
  version code must grow with every APK. In-app update notices are a follow-up.
- Losing the keystore or its passwords means students must uninstall and reinstall: it must be
  backed up outside this computer.
- Android shows "unknown app" warnings (Play Protect); the page tells students what to tap.
- The app palette in the code (`packages/design-system`, provisional red `#B3122E`) does not yet
  follow the brand red of the icon (`#D2454B`).
