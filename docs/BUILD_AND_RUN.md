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

## Option 2 — The real iPhone app (needed to test M1a on your phone)

### What is free and already done

- **Native compile check:** GitHub Actions' free macOS runners build the whole iOS app, including
  the Apple Vision module, for the iOS Simulator with no signing and no Apple account
  (`.github/workflows/ios-native.yml`).
- **Real Apple Vision test:** the same runners test the analysis core with real AVFoundation and
  Apple Vision on macOS, including detection on a real photograph.
- **Not possible for free:** running Vision body pose on the iOS Simulator (Apple does not
  support it; seen in CI), and installing on your iPhone.

### Payment: Apple Developer Program (approved by you on 2026-10-20)

| Question | Answer |
|---|---|
| 1. What needs it? | Installing BadGolfer, the real iPhone app with the Apple Vision analyser, on your iPhone, through TestFlight or an internal build. |
| 2. Why there is no free way | iOS installs only apps signed with an Apple developer certificate. The only free route is Xcode on a Mac (7-day “personal team” installs), and you have no Mac. The browser preview cannot run Apple Vision, and the Simulator cannot run Vision body pose. |
| 3. Cost | **US$99 per year.** Apple charges a local price in the UK; confirm it on Apple's enrolment page, as it changes. |
| 4. Recurring? | **Yes, yearly.** If it lapses, TestFlight builds stop working and the app can't be distributed. |
| 5. What you get | TestFlight installs of every new build on your iPhone and iPad (internal testing needs no App Review); the on-device swing analyser with your own videos; later, App Store release. |

**EAS Build** (cloud build and signing, no Mac): the free Expo plan includes a monthly allowance of
iOS builds. That is enough for testing, but check the current numbers on expo.dev → Pricing.
Nothing on EAS needs paying for unless we exceed the free plan. I will ask before that happens.

## TestFlight setup (iPhone or iPad, no Mac)

You approved the Apple Developer Program on 2026-10-20, and provisionally approved the bundle
identifier **`com.badgolfer.app`**, subject to Apple confirming it is available.

**Never paste a password, the `.p8` key or a token into chat or into any file in this repository.**
Secrets go only into GitHub's encrypted *Secrets*. The IDs below are not secret; they go into
GitHub *Variables*, so you don't need to send them to me either.

On iPhone, the Apple developer and GitHub settings pages work best with **aA → Request Desktop
Website** in Safari. An iPad works as it is.

### A. Apple (US$99 a year, renewed yearly)

1. **Enrol.** Install the **Apple Developer** app from the App Store → Account → **Enrol Now** →
   individual. Pay, then wait for the confirmation email (it can take up to 48 hours).
2. **Team ID.** Safari → `developer.apple.com/account` → *Membership details* → **Team ID** (10
   characters). Your team type is **Individual**.
3. **Register the bundle identifier.** This is how Apple confirms it is available.
   - Go to *Certificates, IDs & Profiles* → *Identifiers* → **+** → *App IDs* → *App*.
   - Enter Description `BadGolfer` and an **Explicit** Bundle ID of `com.badgolfer.app` →
     Continue → **Register**.
   - Leave the capabilities as they are; EAS turns on what the app needs (Data Protection).
   - **If Apple says it is unavailable, stop and tell me.** Don't choose another identifier.
4. **Create the app record.** Safari → `appstoreconnect.apple.com` → *Apps* → **+** → *New App*.
   - Platform iOS, Name **BadGolfer**, Primary language English (UK).
   - Bundle ID `com.badgolfer.app`, SKU `badgolfer-ios`, User access Full.
   - **If the name “BadGolfer” is taken on the App Store, stop and tell me.** We'll choose a store
     name together; the name on your Home Screen stays BadGolfer.
   - Then open *App Information* and note the **Apple ID** number (this is `ASC_APP_ID`).
5. **API key (lets EAS sign and upload without a Mac).**
   - App Store Connect → *Users and Access* → *Integrations* → *App Store Connect API* → *Team Keys*.
     The first time, request access and accept the terms.
   - Tap **+** → name `BadGolfer EAS` → Access **Admin** → *Generate*. Apple requires Admin so that
     EAS can create the signing certificate and profile.
   - Note the **Issuer ID** (at the top of the page) and the **Key ID**.
   - Tap **Download**. Apple allows this **once**. The file `AuthKey_XXXXXXXXXX.p8` goes to
     Files → Downloads.
6. **Copy the key text.** Files → Downloads → long-press the `.p8` file → *Rename* → change the
   ending to `.txt` → open it → long-press the text → *Select All* → *Copy*. You paste it in step C1.

### B. Expo (free)

1. Sign up at `expo.dev` (free plan).
2. **Projects → Create project**, name `BadGolfer`, slug `badgolfer`. Copy the **Project ID**
   shown on the project page (`EAS_PROJECT_ID`). Note your Expo **username** (`EXPO_OWNER`).
3. **Account settings → Access tokens → Create**, named `github-actions-badgolfer`. Copy it; it
   is shown once.

### C. GitHub (this repository)

1. Go to *Settings → Secrets and variables → Actions*. On the **Secrets** tab, add each with
   *New repository secret*:

   | Name | Value |
   |---|---|
   | `EXPO_TOKEN` | the Expo access token (B3) |
   | `ASC_API_KEY_P8` | the whole key text you copied (A6), including the `BEGIN`/`END` lines |

2. On the **Variables** tab, add each with *New repository variable*:

   | Name | Value |
   |---|---|
   | `EAS_PROJECT_ID` | Expo Project ID (B2) |
   | `EXPO_OWNER` | your Expo username (B2) |
   | `APPLE_TEAM_ID` | Team ID (A2) |
   | `ASC_KEY_ID` | Key ID (A5) |
   | `ASC_ISSUER_ID` | Issuer ID (A5) |
   | `ASC_APP_ID` | the app's Apple ID number (A4) |

3. **Delete the `.txt` copy of the key** from Files, and from *Recently Deleted*. If you want a
   backup, keep it only in a password manager. If the key ever leaks, revoke it in App Store
   Connect and make a new one.

### D. Build and install

1. Tell me “TestFlight setup done”; no values are needed. I start the build by adding the label
   `testflight` to PR #3, or you can add it yourself in the GitHub app (PR → Labels).
2. The **iOS TestFlight build (EAS)** workflow then:
   - checks every secret and variable is present and well-formed, naming any that are missing
     but never printing them;
   - builds the signed app on EAS;
   - submits it to TestFlight.

   The free plan's queue can take an hour or more, and Apple then processes the build for about
   10–15 minutes.
3. **Add yourself as a tester (once).** App Store Connect → BadGolfer → *TestFlight* → *Internal
   Testing* → **+** → create the group `Owner` → add yourself → turn on automatic distribution.
4. Install **TestFlight** from the App Store, open it and install **BadGolfer** on your iPhone
   (and iPad if you like). Developer Mode is not needed for TestFlight.
5. Run the device test plan: [`docs/M1A_DEVICE_TEST_PLAN.md`](M1A_DEVICE_TEST_PLAN.md).

**Notes:**
- Each build uses one of the 15 free iOS builds a month.
- TestFlight builds expire after 90 days.
- Export compliance is already answered in the app (`ITSAppUsesNonExemptEncryption = false`).
- **Not yet verified:** that EAS creates the certificate and profile from the API key on the
  first non-interactive run. The workflow follows Expo's documented CI variables, and the first
  run's log will show the result.

## Costs

| Item | When | Cost |
|---|---|---|
| GitHub (public repo) | now | Free. Actions on public repos are free. |
| GitHub Pages | now (browser preview) | Free for public repositories |
| Expo account + EAS Hosting | optional alternative | Free plan (limits on deployments and bandwidth) |
| EAS Build + Submit | M1a device builds | Free plan: 15 iOS builds/month, low-priority queue (expo.dev/pricing, checked 2026-10-20). Paid plans only if ever needed; I will ask first. |
| GitHub Actions macOS runners | now (native compile and Vision tests) | Free for public repositories |
| Apple Developer Program | M1a on your iPhone | US$99/year, recurring. **Approved by you on 2026-10-20** |
| iOS simulator E2E on EAS Workflows | optional | Cost/availability on the free plan **not yet confirmed** (see `docs/TESTING.md`) |
| Cloud sync / backup | M4 | To be decided with you (iCloud vs. Supabase); nothing is committed yet |

## Local developer commands (for anyone with a computer)

```bash
npm install
npm run typecheck && npm run lint && npm test
npm run export:web && npm run test:e2e
npx expo start --web    # live web dev server
```
