# Build, run and view on iPhone (no Mac required)

## What was verified (2026-10-19)

| Question | Finding | Source |
|---|---|---|
| Which Expo SDK can the **App Store** Expo Go run on iPhone? | **SDK 54 only.** “Expo Go on the Apple App Store stops at SDK 54, and SDK 55 and later are not available there.” For SDK 54+ on a physical device, Expo’s route is `eas go` → your own TestFlight team, which **needs an Apple Developer Program membership**. | Expo docs, `troubleshooting/expo-go-version-mismatch` (fetched from the expo/expo docs source on GitHub) |
| Can Expo Go show this app at all? | Only the JavaScript UI. The swing analyser (M1) needs a custom native module, which Expo Go cannot load. In any case Expo Go needs a running dev server or a published update, and the owner has no computer to run one. | Expo docs; project analysis |
| Can the browser preview be hosted for free? | Yes. The repository became **public** on 2026-10-19, so **GitHub Pages** is free and needs no extra account. EAS Hosting (free Expo account) remains an alternative. | GitHub repo visibility = public; Expo docs `guides/publishing-websites` (GitHub Pages + `experiments.baseUrl`) |

**Decision:** the project uses **Expo SDK 57**. It is stable (released 30 June 2026, patched to
57.0.30). SDK 58 is only three weeks old. The App Store Expo Go cannot run either one, so the
SDK choice is not driven by Expo Go.

## Option 1 — Browser preview in Safari (free, recommended for M0)

The real React Native screens are compiled for the web (react-native-web). Data is saved only
in that browser, on that device (SQLite compiled to WebAssembly, stored in IndexedDB).

### 1a. GitHub Pages (primary — no extra account)

Address: **https://p5ccc4kscc-dotcom.github.io/adaptive-golf-coach-ios-/**

**Status: live.** GitHub Pages is enabled (Source: GitHub Actions). The first deployment ran when
PR #1 was merged (workflow run 39327682405, “Reported success!”). The owner tested M0 there in Safari
on their iPhone and accepted it on 2026-10-19. Every merge to `main` redeploys automatically; pull
requests do **not** change the live preview until they are merged.

**Add to Home Screen.** The icon and the name **BadGolfer** come from `apple-touch-icon.png` and
`apple-mobile-web-app-title`.

> **Important:** iOS may open a Home Screen icon as a separate *web app* (the “Open as Web App”
> option). A web app has **its own storage, separate from Safari**, so it starts empty. Your data in
> Safari is not lost; it is still there when you open the address in Safari. To keep one copy, turn
> “Open as Web App” off when adding the icon, or keep using Safari. The manifest asks for
> `display: browser`; whether iOS honours that has not been verified on a device.

### 1b. EAS Hosting (alternative)

`.github/workflows/web-preview.yml` deploys to an `expo.app` address if an `EXPO_TOKEN` secret
is added: free Expo account → Access tokens → repository secret `EXPO_TOKEN`. It is not needed
while GitHub Pages works, and it has not been run.

### Browser-preview limitations

- The swing analyser (Apple Vision) will **never** run in the browser preview.
- Data lives in that browser only. Clearing Safari website data deletes it. Private browsing
  may block storage; the app then shows a warning.
- Two open tabs cannot overwrite each other: the out-of-date one stops and asks for a reload.
- A Home Screen web app has storage separate from Safari (see above).
- The page is publicly reachable by anyone with the address. Your golf data is still stored
  only in your own browser; nothing you enter is uploaded.
- It looks and behaves close to the app, but small iOS-specific differences (fonts, gestures)
  will exist.

## Option 2 — The real iPhone app (needed from M1)

Needs the **Apple Developer Program** (US$99/year, about £79 in the UK; check the current price).

1. Join the Apple Developer Program. This can be done in the Apple Developer app on iPhone.
2. Create an **App Store Connect API key** in a browser (App Store Connect → Users and Access
   → Integrations). EAS can then create certificates and profiles non-interactively, so no
   Mac is needed. I will confirm the exact current EAS steps when we reach M1.
3. Register your iPhone for internal builds, using a link opened on the phone that installs a
   profile.
4. On the iPhone: **Settings → Privacy & Security → Developer Mode → On**.
5. EAS builds the `development` or `preview` profile in the cloud (`eas.json`). You install it
   from a link. Later builds go to **TestFlight** via EAS Submit.

## Costs

| Item | When | Cost |
|---|---|---|
| GitHub (public repo) | now | Free. Actions on public repos are free. |
| GitHub Pages | now (browser preview) | Free for public repositories |
| Expo account + EAS Hosting | optional alternative | Free plan (limits on deployments and bandwidth) |
| EAS Build | M1+ | Free plan: a limited number of low-priority builds per month. Starter plan is US$19/month with US$45 build credit, if ever needed. |
| Apple Developer Program | M1 (native analyser on device) | US$99/year |
| iOS simulator E2E on EAS Workflows | optional | Cost/availability on the free plan **not yet confirmed** (see `docs/TESTING.md`) |
| Cloud sync / backup | M4 | To be decided with you (iCloud vs. Supabase); nothing is committed yet |

## Local developer commands (for anyone with a computer)

```bash
npm install
npm run typecheck && npm run lint && npm test
npm run export:web && npm run test:e2e
npx expo start --web    # live web dev server
```
