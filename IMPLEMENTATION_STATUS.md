# Implementation status

_Last updated: 2026-10-19 (M0 delivery)._ Legend: **DONE** · **PARTIAL** · **NOT STARTED** · **BLOCKED EXTERNALLY**

## Milestones

| Milestone | Status | Notes / blocker and owner action |
|---|---|---|
| **M0** Foundation: project, navigation, onboarding, club catalogue, Brand/Model, My Clubs, Build My Bag, persistence | **DONE** (all acceptance criteria below verified in the browser build) / **PARTIAL** for native iOS | Native iOS binary not yet built. Needs an Expo account (free) for EAS Build, and Apple Developer membership to install on a phone. The iOS JavaScript bundle *does* build (`expo export --platform ios`). |
| Browser preview deployment | **BLOCKED EXTERNALLY** | Owner: create a free Expo account and add the `EXPO_TOKEN` repo secret (see `docs/BUILD_AND_RUN.md`). Workflow written but never run. |
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
| Browser E2E | `npx playwright test` (Chromium, iPhone 13 viewport) | ✅ **8 tests passed** |
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
- The browser preview stores data per browser; two tabs can conflict. Data can be lost if Safari
  website data is cleared.
- Tab-bar icons are text glyphs, not a designed icon set.
- The spec copy in `docs/spec/MASTER_SPEC_V2.md` is **unverified** (transcribed from chat). The
  repository had no specification.

## Next three executable steps

1. **Owner:** create a free Expo account, add the `EXPO_TOKEN` secret, merge the M0 branch to
   `main`. I then verify the EAS Hosting deployment from the Actions logs and fix any first-run
   problems.
2. **M1a:** scaffold the local Expo native module `modules/golf-vision` (Swift: AVFoundation
   probe + Vision 2D pose with real timestamps, progress and cancel) behind the TypeScript
   `PoseEstimator` interface. Write the TypeScript orientation/missingness/smoothing tests
   first.
3. **M1a build:** run an EAS development build once Apple Developer membership is in place. You
   install it and run the prototype on your own face-on and down-the-line clips. We record
   detection rates and overlay alignment before building the full analyser UI.
