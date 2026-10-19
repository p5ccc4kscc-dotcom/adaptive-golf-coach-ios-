# Implementation status

_Last updated: 2026-10-19 (M0 delivery, after spec reconciliation and the CI fix)._
Legend: **DONE** · **PARTIAL** · **NOT STARTED** · **BLOCKED EXTERNALLY**

Authoritative spec: [`docs/spec/adaptive_golf_coach_codex_master_prompt_v2.md`](docs/spec/adaptive_golf_coach_codex_master_prompt_v2.md)
(owner's original). Architecture overrides: [`docs/spec/PROJECT_INSTRUCTIONS.md`](docs/spec/PROJECT_INSTRUCTIONS.md).

## Milestones

| Milestone | Status | Notes / blocker and owner action |
|---|---|---|
| **M0** Foundation: project, navigation, onboarding, club catalogue, Brand/Model, My Clubs, Build My Bag, persistence | **DONE** in the browser build (every acceptance criterion verified below) / **PARTIAL** for native iOS | No native iOS binary has been built yet; that needs an Expo account (free) for EAS Build, and Apple Developer membership to install on a phone. The iOS JavaScript bundle does build (`expo export --platform ios`). |
| Browser preview (GitHub Pages) | **BLOCKED EXTERNALLY** | Owner: Settings → Pages → Source **GitHub Actions**, then merge PR #1. The workflow is ready and passes `actionlint`; the identical sub-path build passes all browser tests. Not yet deployed. |
| **M1** Offline video analyser (Apple Vision native module) | **NOT STARTED** | Not started, by instruction, until the owner has tested and approved M0. Needs the Apple Developer Program (to run on the iPhone) and owner-supplied swing clips. |
| **M2** Curriculum, competency and refresher engine | NOT STARTED | The `player_skill_baseline` model and repository exist (supersede-only); the Learn tab shows “Not available yet”. |
| **M3** Rounds, practice logging, trends, import | NOT STARTED | M0 stores self-reported baseline rounds (totals or hole-by-hole putts) and range sessions. JSON export is done; import is not. |
| **M4** Accounts / sync / video backup | NOT STARTED | `SyncProvider` states exist (local only). The provider decision (iCloud vs. Supabase) is needed from the owner. |
| **M5** Live camera, club tracking | NOT STARTED | — |
| **M6** Product readiness | NOT STARTED | `docs/RELEASE_CHECKLIST.md` |

## M0 acceptance criteria (spec §10)

| Criterion | Result | Evidence |
|---|---|---|
| Real app code and project scaffold; main navigation launches | ✅ | Expo SDK 57 project; 5 tabs + stack screens; web build boots with no console errors |
| Brand-new user gets **no pre-filled real-person profile** | ✅ | `tests/data/persistence.test.ts` (fresh install), `tests/unit/noProductionFixtures.test.ts`, E2E “explore with an empty profile”, E2E Scenario A (nothing pre-selected) |
| Can skip **or** complete onboarding | ✅ | E2E Scenario A (complete), “fully skipped onboarding stays blank”, “explore with an empty profile” |
| Partial onboarding persists across relaunch | ✅ | E2E: reload at step 3 resumes at step 3; data test |
| Mixed-brand **partial** iron set, no auto-filled gaps | ✅ | E2E: 5, 7, 8, 9 (no 6), with the 7-iron's brand changed on its own; data test |
| A custom club via visible club-face tiles | ✅ | E2E: “Custom / other club”, custom driving iron, “W” stamped wedge, wedge by loft |
| A **different Brand for each club** | ✅ | E2E Scenario A, two 5-irons with brands A and B |
| Select/deselect into My Bag, **max 14** competition clubs | ✅ | E2E: 15th refused from the add form and from Build My Bag with a swap offer; swap; presets; practice selection > 14 labelled |
| Relaunch without losing data | ✅ | E2E reloads; data tests reopen the database from saved bytes; two-tab test proves a stale tab cannot overwrite newer data |
| No mock analysis appears as real | ✅ | Analyse/Learn/Rounds show “Not available yet”; no sample data anywhere |

## Differences from the V2 specification

Reconciled against the owner's original on 2026-10-19. The earlier transcription matched it word for
word (9,246 words, no differences), so no requirement had been lost.
Each entry gives its status: **Fixed** (done in this update), **Approved override**, **Deferred**
(belongs to a later milestone, labelled in the UI), or **Interpretation** (please confirm).

### Approved architecture overrides (owner instruction)
| Spec | Implemented as |
|---|---|
| §1.1 native Swift/SwiftUI; §15.1 Xcode project | React Native + Expo + TypeScript, built by EAS; native folders generated |
| §8 SwiftData | SQLite (expo-sqlite; sql.js in the browser preview) with append-only migrations |
| §11 XCTest / XCUITest | Jest + React Native Testing Library + Playwright; Maestro on the iOS simulator planned |
| §4.1 Apple Vision | Kept: custom Expo native module in M1 |

### M0-scope items fixed in this update
| Spec | Was | Now |
|---|---|---|
| §2.4 “Include list and **grouped visual grid**” | Grouped list and bag-order list only | **Fixed:** a grouped visual grid view in My Clubs, with an in-bag checkbox on every tile |
| §2.1 step 7 “**per-hole putts**” | Round totals only | **Fixed:** putts can be “not counted”, a total, or hole by hole. Blank holes are shown as not recorded, with a denominator (e.g. “12 putts (6/9 holes recorded)”), never as 0 |
| §2.1 step 7 “**recent range outcomes**” | Not captured | **Fixed:** range sessions with club, context, shots, optional successes and the golfer's own definition of success |
| §2.4 “**Choose another owned club** and **Unknown / not entered**” | No club pickers in M0 | **Fixed:** `ClubPicker` by ClubInstanceID, defaulting to the active bag; works with an empty bag (used for range sessions) |
| §2.5 models **GolfCoachNote**, **PlayerSkillBaseline** | Deferred | **Fixed:** both persisted (schema v2). Coach notes are dated, self-reported and archived rather than deleted; skill baselines are supersede-only, ready for M2 |
| §8 **SyncProvider** with explicit states | Not implemented | **Fixed:** `local_only` / `icloud_not_configured` / `syncing` / `synced` / `sync_failed` / `conflict`; Settings shows the live status and never claims a backup |
| §8 “use file protection/encryption available on iOS” | Platform default | **Fixed (config):** `NSFileProtectionComplete` default data-protection entitlement. Not yet verified in an EAS build |
| §2.1 step 3 “Support ‘I don't know’” | Blank meant unknown | **Fixed:** explicit “I don't know” for height and wrist-to-floor (stored as `not_provided`) |
| §2.1 step 2 optional age range “only if it serves a demonstrated coaching purpose” | Asked, but used by nothing | **Fixed:** removed. It can return once a feature needs it |
| §2.4 quick “**Save Setup**” | Labelled “Save as new bag…” | **Fixed:** labelled “Save Setup…”; the help text explains that changes save automatically and this keeps a named copy |
| §8 interfaces `ClubCatalogRepository`, `ClubInventoryRepository`, `BagPresetRepository`, `OnboardingRepository` | Implicit | **Fixed:** exported repository types |
| Data integrity (§2.4 history-safe, §8) | Whole-file saves, last writer wins | **Fixed (hardening):** browser saves are revision-guarded, so a stale tab cannot overwrite newer data (see `docs/TESTING.md`, CI incident) |

### Deferred to later milestones (labelled “Not available yet” in the UI)
| Spec | Milestone |
|---|---|
| §2.3 club photo uploaded by the golfer (table exists) | M1 (media import) |
| §2.1 step 7 swing videos in baseline | M1 |
| §2.4 round snapshots of the bag; club picking in video/round screens | M1 / M3 (bag membership history is already stored) |
| §2.1 step 8 drill steps and outcome logging for the starter session (the outline is real and bag-aware) | M2 |
| §3 Today: drill, next challenge, strengths, refresher flags | M2 |
| §3 practice contexts (Home, Range, Course, Putting Green, Indoor) and one-tap repeat | M2 / M3 |
| §7 scorecards, FIR/GIR, trends; JSON/CSV import and backup verification | M3 |
| §8 iCloud / CloudKit sync and video backup | M4 |
| §2.5, §11 Dynamic Type and VoiceOver **audit** on a device (labels and states are implemented) | Physical device testing |

### Interpretations to confirm
- **Units default from the phone's region** (measurement system). They are shown on “About your golf”
  and in Settings, and can be changed. Treated as a display preference that respects the locale
  (§1.8), not as a profile fact filled in from the device (§2.1).
- A **“W”** stamp maps to a “Wedge with other stamp” type with no loft. “P” offers pitching wedge
  and putter as candidates. A plus handicap is entered as a negative number.

## Test results

Environment: Linux sandbox, Node 22, no Xcode or iOS simulator. These are local results for this commit;
the CI results for the same commit are on PR #1.

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | ✅ no errors |
| ESLint | `npm run lint` | ✅ no problems |
| Jest (unit, real-SQLite data, IndexedDB guard, native-renderer components) | `npx jest --ci` | ✅ **12 suites, 99 tests** |
| Browser E2E, root build (Chromium, iPhone 13 viewport) | `npx playwright test` | ✅ **12/12** |
| Browser E2E, GitHub Pages sub-path build | `npm run test:e2e:pages` | ✅ **12/12**, and **36/36** with `--repeat-each=3` |
| iOS JavaScript bundle | `expo export --platform ios` | ✅ Hermes bundle builds (no native binary compiled) |
| Workflow lint | `actionlint .github/workflows/*.yml` | ✅ |

**Not run:**
- Physical iPhone or iPad.
- Safari/WebKit.
- iOS-simulator Maestro flows (drafted; need an Expo account, cost unconfirmed).
- Native EAS build, including the file-protection entitlement.
- On-device VoiceOver and Dynamic Type audit.

## Known limitations (M0)

- The browser preview stores data in that browser only. Clearing Safari website data deletes it.
- If two tabs are used, the stale one stops and asks for a reload (by design).
- The browser preview can never run the Apple Vision analyser.
- The app icon and splash are Expo's defaults. The bundle ID `com.example.adaptivegolfcoach` is a placeholder.
- Tab-bar icons are text glyphs.

## Next three executable steps (after owner approval of M0)

1. **Owner:** enable GitHub Pages (Source: GitHub Actions), merge PR #1, test M0 in Safari. I then
   verify the deployment logs and the live URL.
2. **M1a:** scaffold the local Expo native module `modules/golf-vision` (Swift: AVFoundation probe +
   Vision 2D pose with real timestamps, progress and cancel) behind the TypeScript `PoseEstimator`
   interface, with orientation, missingness and smoothing tests written first.
3. **M1a build:** run an EAS development build once Apple Developer membership is in place. The owner
   installs it and runs the prototype on their own face-on and down-the-line clips.
