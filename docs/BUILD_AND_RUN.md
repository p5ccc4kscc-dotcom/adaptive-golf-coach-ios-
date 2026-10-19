# Build, run and view on iPhone (no Mac required)

## What was verified (2026-10-19)

| Question | Finding | Source |
|---|---|---|
| Which Expo SDK can the **App Store** Expo Go run on iPhone? | **SDK 54 only.** “Expo Go on the Apple App Store stops at SDK 54, and SDK 55 and later are not available there.” For SDK 54+ on a physical device, Expo’s route is `eas go` → your own TestFlight team, which **needs an Apple Developer Program membership**. | Expo docs, `troubleshooting/expo-go-version-mismatch` (fetched from the expo/expo docs source on GitHub) |
| Can Expo Go show this app at all? | Only the JavaScript UI. The swing analyser (M1) needs a custom native module, which Expo Go cannot load. In any case Expo Go needs a running dev server or a published update, and the owner has no computer to run one. | Expo docs; project analysis |
| Can the browser preview be hosted for free? | Yes, via **EAS Hosting** with a free Expo account. GitHub Pages is **not** available because this repository is private on a free GitHub plan. | Expo docs `eas/hosting/get-started`; repo visibility = private |

**Decision:** the project uses **Expo SDK 57**. It is stable (released 30 June 2026, patched to
57.0.30). SDK 58 is only three weeks old. The App Store Expo Go cannot run either one, so the
SDK choice is not driven by Expo Go.

## Option 1 — Browser preview in Safari (free, recommended for M0)

The real React Native screens are compiled for the web (react-native-web) and published to an
`https://<name>.expo.app` address. Data is saved only in that browser, on that device
(SQLite compiled to WebAssembly, stored in IndexedDB).

### One-time setup (all from iPad/iPhone Safari)

1. Create a free account at **expo.dev/signup**.
2. On expo.dev, open **Account settings → Access tokens → Create token** and copy it.
3. On github.com, open this repository, then **Settings → Secrets and variables → Actions →
   New repository secret**. Name it `EXPO_TOKEN` and paste the token as the value.
4. Merge the M0 pull request/branch into `main`. That push starts the **“Deploy browser
   preview (EAS Hosting)”** workflow. Later you can re-run it from **Actions → Run workflow**;
   GitHub only shows that button once the workflow file is on `main`.
5. When the run finishes, the address appears in the workflow log (the `eas deploy` step) and
   in **expo.dev → your project → Hosting**.
6. Open that address in Safari. Optionally use **Share → Add to Home Screen**.

### Status: not yet verified

The workflow (`.github/workflows/web-preview.yml`) has been written but has **never run**,
because no `EXPO_TOKEN` exists yet. The development sandbox cannot reach expo.dev, so the
first deployment can only happen on GitHub’s runners. Possible first-run issues:

- `eas init` may need the project created on expo.dev first.
- The hosting subdomain may need to be chosen in **Hosting** on expo.dev.

Once the secret is added I can read the workflow logs and fix anything that fails. What has been
verified locally: the same `expo export --platform web` build passes all 7 browser
end-to-end tests at iPhone screen size in Chromium. That is not Safari on iOS.

### Browser-preview limitations

- The swing analyser (Apple Vision) will **never** run in the browser preview.
- Data lives in that browser only. Clearing Safari website data deletes it. Private browsing
  may block storage; the app then shows a warning.
- Two open tabs can overwrite each other’s saves.
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
| GitHub (private repo) | now | Free plan. Actions minutes are included; CI uses Linux runners. |
| Expo account + EAS Hosting | now (browser preview) | Free plan (limits on deployments and bandwidth) |
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
