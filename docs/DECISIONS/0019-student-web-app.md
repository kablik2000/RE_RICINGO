# ADR-0019: The student app as an installable web app (PWA)

- Status: **Accepted** (owner request 2026-11-27: "co to udělat jako webovou stránku?")
- Date: 2026-11-27
- Relates to: ADR-0016 (Android APK download), ADR-0015 (VPS), ADR-0005 (store releases),
  ADR-0001 (Expo); answers Q-4 (platforms) for now: iPhone, Android and computers via the web

## Context

Students need the app on iPhones and Android phones. The APK (ADR-0016) installs only on Android,
with "unknown source" warnings; iPhones need an Apple Developer account and App Store or
TestFlight review. The app is Expo (React Native), which also builds for the web from the same
code; a web preview existed, but it kept everything in memory and could not reach the API.

## Decision

1. **The student app is also published as a web app** at `https://app.rici.esprog.eu`, built
   from `apps/mobile` with `expo export --platform web` (single-page app). Native builds stay
   possible from the same code; the APK stays as a fallback until the web app has proven itself.
2. **Offline first, as on the phone:**
   - lessons, settings and practice progress in **IndexedDB** (`indexeddb-local-store.ts`, the
     web side of `LocalStore`; persistent storage is requested from the browser);
   - the session token in `localStorage` (no secure storage on the web), protected by a strict
     Content Security Policy (`script-src 'self'`, no inline scripts);
   - a **service worker** (`sw.js`, written after the export by `scripts/write-service-worker.mjs`)
     precaches every file of the build, so the app starts offline. The API is never cached. A
     new version waits until the app is closed, so a running app never mixes two builds.
3. **Installable:** web manifest, icons, iOS meta tags (`public/index.html`); the Home tab shows
   how to add the app to the home screen (Safari: Sdílet → Přidat na plochu; Chrome: install
   prompt) until it is installed or dismissed.
4. **Same origin for the API:** the proxy on the VPS serves the app and forwards `/api/*` of the
   same host to the API, so the API needs no CORS and the app connects only to itself. A built web
   app uses its own origin as the API URL; the web development preview downloads nothing.
5. **Delivery:** a `rici-web` image (Caddy serving the build, `apps/mobile/Dockerfile.web`) built
   by the release workflow like the API and Studio images and run by `deploy/compose.yaml`.
6. Browsers do not tell Wi-Fi from mobile data, so the web app downloads lessons on any
   connection (they are small).

## Consequences

- One link for iPhone, Android and computers; no store fees or review; updates reach students
  with the next release.
- **iPhone limits:** installing is manual (Sdílet → Přidat na plochu). Safari may delete the data
  of a site not used for a while unless the app is on the home screen — hence the install hint and
  the priority of server-side progress (ADR-0013 step 6). Pronunciation uses the browser's voices.
- Not listed in the App Store or Google Play; the native builds remain the way there.
- The web app needs DNS for `app.rici.esprog.eu` and the updated `deploy.sh` on the server.
