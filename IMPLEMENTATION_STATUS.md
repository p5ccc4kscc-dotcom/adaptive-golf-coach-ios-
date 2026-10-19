# Implementation status

_Last updated: 2026-10-19 (M0 delivery)._ Legend: **DONE** · **PARTIAL** · **NOT STARTED** · **BLOCKED EXTERNALLY**

## Milestones

| Milestone | Status | Notes / blocker and owner action |
|---|---|---|
| **M0** Foundation: project, navigation, onboarding, club catalogue, Brand/Model, My Clubs, Build My Bag, persistence | **DONE** (all acceptance criteria below verified in the browser build) / **PARTIAL** for native iOS | Native iOS binary not yet built. Needs an Expo account (free) for EAS Build, and Apple Developer membership to install on a phone. The iOS JavaScript bundle *does* build (`expo export --platform ios`). |
| Browser preview deployment (GitHub Pages) | **BLOCKED EXTERNALLY** | Owner: Settings → Pages → Source “GitHub Actions”, then merge `claude/m0-foundation` into `main`. The workflow is written; the sub-path build passes E2E locally; it has not deployed yet. |
| **M1** Offline video analyser (Apple Vision native module) | **NOT STARTED** | Not started, by instruction, until M0 is accepted. Needs: Apple Developer Program (to run on the iPhone), owner-supplied swing clips for validation. |
| **M2** Curriculum, competency & refresher engine | NOT STARTED | Learn tab shows “Not available yet”. |
| **M3** Rounds, practice logging, trends, import | NOT STARTED | M0 stores self-reported baseline round totals only. JSON export done; import not started. |
| **M4** Accounts / sync / video backup | NOT STARTED | Provider decision (iCloud vs. Supabase) needed from owner before work starts. |
| **M5** Live camera, club tracking | NOT STARTED | — |
| **M6** Product readiness | NOT STARTED | `docs/RELEASE_CHECKLIST.md` |

## M0 acceptance criteria (spec §10)

| Criterion | Result | Evidence |
|---|---|---|
| Real app code and project scaffold; main navigation launches | ✅ | Expo SDK 57 project; 5 tabs + stack screens; web build boots with no console errors |
| Brand-new user gets **no pre-filled real-person profile** | ✅ | `tests/data/persistence.test.ts` (fresh install), `tests/unit/noProductionFixtures.test.ts`, E2E “explore with an empty profile”, E2E Scenario A checks nothing is pre-selected |
| Can skip **or** complete onboarding | ✅ | E2E: Scenario A (complete), “fully skipped onboarding stays blank”, “explore with an empty profile” |
| Onboarding persists partial progress across relaunch | ✅ | E2E: reload at step 3 resumes at step 3; data test for progress |
| Mixed-brand **partial** iron set (no auto-filled gaps) | ✅ | E2E: 5, 7, 8, 9 with no 6; 7-iron brand changed separately. Data test for the iron set helper |
| A custom club via visible club-face tiles | ✅ | E2E: “Custom / other club” and custom driving iron |
| A **different Brand typed for each club** | ✅ | E2E Scenario A (5 brands + 1 blank), two 5-irons A/B |
| Select/deselect clubs into My Bag, **max 14** competition clubs | ✅ | E2E: 15th refused (from the add form and from Build My Bag) with a swap offer; swap; presets; practice selection > 14 labelled |
| Relaunch without losing data | ✅ | E2E page reloads (IndexedDB-backed SQLite); data tests reopen the DB from saved bytes |
| No mock analysis appears as real | ✅ | Analyse/Learn/Rounds show “Not available yet” cards; no sample data anywhere |

## Test results (actual, this commit)

Environment: Linux sandbox, Node 22.22, no Xcode, no iOS simulator. expo.dev / exp.host unreachable from the sandbox.

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | ✅ no errors |
| ESLint | `npm run lint` | ✅ no problems |
| Jest (unit + real-SQLite data + native component) | `npx jest --ci` | ✅ **9 suites, 82 tests passed** |
| Web export | `expo export --platform web` | ✅ built `dist/` (1.3 MB JS bundle) |
| iOS JS bundle | `expo export --platform ios` | ✅ Hermes bundle built (3 MB). **No native binary compiled.** |
| Browser E2E | `npx playwright test` (Chromium, iPhone 13 viewport) | ✅ **8 tests passed** at the root path **and** 8/8 under the GitHub Pages sub-path `/adaptive-golf-coach-ios-/` |
| expo-doctor | `npx expo-doctor` | 19/21 passed. 2 failed only because exp.host and React Native Directory are unreachable from the sandbox. A real duplicate `expo-font` issue was found and fixed with an npm override. |

**Not run:**
- iOS simulator tests (Maestro flows written; needs an Expo account; cost unconfirmed).
- Any test on a physical iPhone or iPad.
- Safari/WebKit.
- The browser-preview deployment.
- VoiceOver and Dynamic Type audits on a device.

## Known limitations (M0)

- Club photo upload is shown as “Not available yet” (arrives with media import in M1).
- Import from a backup is not built; export is.
- Baseline rounds are totals only; hole-by-hole scoring arrives in M3.
- `PlayerSkillBaseline` and `GolfCoachNote` models are deferred to M2. Coach name and notes are
  captured as profile facts for now.
- The app icon and splash are still the Expo template images. The bundle ID
  `com.example.adaptivegolfcoach` is a placeholder.
- The browser preview stores data per browser; two tabs can conflict. The preview URL is public; entered data stays in the browser. Data can be lost if Safari
  website data is cleared.
- Tab-bar icons are text glyphs, not a designed icon set.
- The spec copy in `docs/spec/MASTER_SPEC_V2.md` is **unverified** (transcribed from chat). The
  repository had no specification.

## Differences from the V2 specification (M0)

Compared against the **unverified** copy in `docs/spec/MASTER_SPEC_V2.md`. These will be
reconciled again against the owner's original `adaptive_golf_coach_codex_master_prompt_v2.md`
before merge.

**Approved architecture overrides (owner instruction, not gaps)**
- React Native + Expo + TypeScript + EAS, instead of SwiftUI/Xcode.
- SQLite (expo-sqlite / sql.js), instead of SwiftData.
- Jest + Playwright (+ Maestro, planned), instead of XCTest/XCUITest.
- Apple Vision is kept, via a custom Expo native module (M1).

**Partial or deferred within M0 scope**
- My Clubs offers *grouped by category* and *bag-order list* views. The spec also asks for a
  **visual grid** of owned clubs; only the Club Face Gallery is a grid. Not yet done.
- **Club photo upload**: data table exists, UI shows “Not available yet” (needs media import, M1).
- **Baseline import**: round totals only (score, total putts, course). **Per-hole putts** and
  **recent range outcomes** are not captured yet (M3). Swing videos are “Not available yet” (M1).
  Club distances are entered per club.
- `PlayerSkillBaseline` and `GolfCoachNote` models are deferred to M2. The coach's name and notes
  are stored as profile facts for now.
- **Starter plan** gives a real, rule-based outline (areas, the golfer's own clubs, reasons).
  Drill steps and outcome logging arrive with M2.
- **“Save Setup”** is implemented as **“Save as new bag…”**. Bag changes are saved immediately,
  so there is no separate save step.
- **`SyncProvider` states** (`local_only`, `icloud_not_configured`, …) are not implemented as an
  interface yet. Settings states that sync is not configured (M4).
- **“Choose another owned club / Unknown”** pickers belong to the video and round screens (M1/M3).
  Round snapshots of the bag are M3; membership history is already stored to support them.
- iOS file protection uses the platform default; an explicit `Complete` protection class has not
  been configured.
- Dynamic Type and VoiceOver: text scales with the system setting and controls have labels and
  states, but **no on-device audit** has been done.

**Interpretations to confirm**
- **Units** default from the phone's region (measurement system). They are shown on the
  About-your-golf step and in Settings, and can be changed. Treated as a display preference,
  not a profile fact filled from the device.
- **Optional age range** is included with a privacy explanation (“keep practice suggestions
  comfortable”). The spec allows it only with a demonstrated coaching purpose. It can be removed.
- A **“W”** stamp maps to a “Wedge with other stamp” type, never to a loft. “P” offers
  pitching wedge *and* putter as candidates. A plus handicap is entered as a negative number.

## Next three executable steps

1. **Owner:** enable GitHub Pages (Source: GitHub Actions) and merge the M0 branch to `main`.
   I then verify the Pages deployment from the Actions logs and the live URL, and fix any
   first-run problems.
2. **M1a:** scaffold the local Expo native module `modules/golf-vision` (Swift: AVFoundation
   probe + Vision 2D pose with real timestamps, progress and cancel) behind the TypeScript
   `PoseEstimator` interface. Write the TypeScript orientation/missingness/smoothing tests
   first.
3. **M1a build:** run an EAS development build once Apple Developer membership is in place. You
   install it and run the prototype on your own face-on and down-the-line clips. We record
   detection rates and overlay alignment before building the full analyser UI.
