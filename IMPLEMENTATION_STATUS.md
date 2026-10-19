# Implementation status — BadGolfer

_Last updated: 2026-10-19 (M0 accepted; M0.1 in review; M1a prototype in review on its own branch)._

Product name: **BadGolfer** (formerly the working name “Adaptive Golf Coach”; see [`docs/BRAND.md`](docs/BRAND.md)).
Legend: **DONE** · **PARTIAL** · **NOT STARTED** · **BLOCKED EXTERNALLY**

Authoritative spec: [`docs/spec/adaptive_golf_coach_codex_master_prompt_v2.md`](docs/spec/adaptive_golf_coach_codex_master_prompt_v2.md)
(owner's original). Architecture overrides: [`docs/spec/PROJECT_INSTRUCTIONS.md`](docs/spec/PROJECT_INSTRUCTIONS.md).

## What has been validated, and where

| Area | Status | Evidence |
|---|---|---|
| **M0 browser functionality** | **User-tested and accepted** (Safari on the owner's iPhone, 2026-10-19) | Owner's manual test, see “M0 formal acceptance” below; automated browser tests in Chromium |
| **Native iOS app** | **Not validated.** No native binary has been built or installed. | Only the iOS JavaScript bundle has been compiled (`expo export --platform ios`). Passing browser tests does **not** show that the native app works. |
| **Cloud synchronisation / backup** | **Not implemented** (planned, M4) | Settings shows “Local only · Nothing is backed up or synced” |
| **Video swing analysis** | **M1a prototype built; NOT validated on an iPhone** | Compiles into the iOS app and passes real Apple Vision tests on macOS (CI). The browser preview cannot run it and says so. No device build exists yet (needs the Apple Developer Program). |

## M0 formal acceptance (2026-10-19)

The owner tested the GitHub Pages browser preview in **Safari on their physical iPhone** and accepted
M0 **for the Safari browser-preview scope**. These passed the owner's manual testing:

- personalised onboarding completed;
- all 17 of the owner's own clubs appeared correctly. The extra driving/utility irons were added
  deliberately and are not a catalogue error;
- individual Brand and Model fields could be edited and saved;
- the 14-club competition bag limit worked;
- club swapping and selection worked;
- different bag setups worked;
- data persisted after closing and reopening Safari.

This acceptance covers the browser preview only. It does not cover the native iPhone app, cloud
sync or swing analysis (see the table above).

## Milestones

| Milestone | Status | Notes / blocker and owner action |
|---|---|---|
| **M0** Foundation: project, navigation, onboarding, club catalogue, Brand/Model, My Clubs, Build My Bag, persistence | **ACCEPTED** (browser preview) / native iOS **not validated** | Accepted by the owner on 2026-10-19 after testing in Safari on iPhone. No native iOS binary has been built yet. |
| Browser preview (GitHub Pages) | **DONE (live)** | https://p5ccc4kscc-dotcom.github.io/adaptive-golf-coach-ios-/ — first deployed on the PR #1 merge (run 39327682405) and used by the owner for the M0 test. |
| **M0.1** BadGolfer branding and interface refinements | **IN REVIEW** (branch `claude/m0.1-badgolfer`) | See “M0.1” below. Not merged until the owner approves. |
| **M1a** Swing-analyser technical prototype (Apple Vision native module) | **IN REVIEW** (branch `claude/m1a-swing-analyser`, stacked on M0.1) / **device validation BLOCKED EXTERNALLY** | See “M1a” below and `docs/M1A_SWING_ANALYSER.md`. Owner: approve the Apple Developer Program cost and the bundle identifier, then provide swing clips. |
| **M1b** Remaining analyser features | NOT STARTED | Not to start until the owner accepts M1a. |
| **M2** Curriculum, competency and refresher engine | NOT STARTED | The `player_skill_baseline` model and repository exist (supersede-only); the Learn tab shows “Not available yet”. |
| **M3** Rounds, practice logging, trends, import | NOT STARTED | M0 stores self-reported baseline rounds (totals or hole-by-hole putts) and range sessions. JSON export is done; import is not. |
| **M4** Accounts / sync / video backup | NOT STARTED | `SyncProvider` states exist (local only). The provider decision (iCloud vs. Supabase) is needed from the owner. |
| **M5** Live camera, club tracking | NOT STARTED | — |
| **M6** Product readiness | NOT STARTED | `docs/RELEASE_CHECKLIST.md` |

## M1a — swing analyser technical prototype (in review)

Full description, architecture and evidence: [`docs/M1A_SWING_ANALYSER.md`](docs/M1A_SWING_ANALYSER.md).

| # | Requirement (owner brief §5) | Status | Evidence / limitation |
|---|---|---|---|
| 1 | Import from Photos | **Built, untested on device** | `expo-image-picker` (passthrough, current representation), private copy |
| 2 | Real metadata (duration, orientation, frames) | ✅ macOS + Simulator | `VideoProbe` tests; frame count labelled as an estimate |
| 3 | Frames with accurate timestamps | ✅ macOS | AVAssetReader; 240 fps clip, timestamps within 1 µs |
| 4 | Genuine Apple Vision body pose | ✅ macOS / ⛔ Simulator (unsupported by Apple) / ❓ iPhone | Real photograph detected at all four rotations |
| 5 | Joint coordinates + confidence | ✅ | 19 joints, x/y/confidence; missing stays missing |
| 6 | Joints over the corresponding frames | **Built, untested on device** | Exact-time frame extraction (✅ macOS) + overlay drawn only over the frame it belongs to |
| 7 | Scrubbing, frame by frame | **Built, untested on device** | 44 pt scrub bar, ◀/▶ frame, phase jumps |
| 8 | Video-quality and confidence checks | ✅ unit-tested | Engineering thresholds, not validated |
| 9 | Candidate phases with uncertainty | ✅ unit-tested on synthetic data | ± stated; golfer can mark frames; accuracy on real swings unknown |
| 10 | Face-on and down the line | ✅ | View required before analysis; view-specific measures and wording |
| 11 | Left- and right-handed | ✅ | Hand per video; lead side and target direction from the hand, never guessed |
| 12 | Compare two recordings | **Built, untested on device** | Timing across views; 2D only within the same view; uncertainty-aware |
| 13 | Preserve footage and metadata | ✅ data tests | Photos original untouched; every run kept; archive, not delete |
| 14 | Cancellation, errors, poor files | ✅ macOS | Coded errors; cancel; frame cap; “unusable” shows no results |
| — | Native module integrates with Expo SDK 57 | ✅ CI (run 39337882406) | `expo prebuild` + `pod install` (GolfVision in `Podfile.lock`) + `xcodebuild` Debug for the iOS Simulator, unsigned: **BUILD SUCCEEDED**, with `GolfVisionModule.swift` compiled (Xcode on macOS 26 runner, 24 min) |
| — | EAS build for a device | ⏸ **Blocked** | Needs the Apple Developer Program (cost to approve) and the bundle identifier |
| — | Portrait, landscape and high frame rate | ✅ synthetic clips on macOS / ❓ real iPhone clips | 0/90/180/270° rotations and 240 fps tested |

**Measurement integrity:**
- Clubface, path, face-to-path, speeds, spin, launch, carry and strike are never computed.
- Every value is labelled detected 2D, calculated 2D, estimated or manual.
- No fault labels exist, and observations are marked not eligible as mastery evidence.

## M0.1 — BadGolfer branding and interface refinements (in review)

| Requirement | Result | Evidence |
|---|---|---|
| App display name and Home Screen name **BadGolfer** | ✅ in config | `app.json` `name` + `CFBundleDisplayName`; web title, `apple-mobile-web-app-title`, manifest. Native name not yet seen on a device (no build yet). |
| Original app icon and visual identity | ✅ | `assets/brand/*.svg`, rendered by `npm run brand:icons`; mark, wordmark, tab icons (`docs/BRAND.md`) |
| Onboarding, dashboard, headings and messages renamed | ✅ | No “Adaptive Golf Coach” remains in UI code; E2E checks title and wordmark |
| Repository name and history kept | ✅ | Unchanged |
| Permanent bundle identifier | ⏸ **Proposed, awaiting approval** | `docs/BRAND.md` recommends `com.badgolfer.app` (if you control `badgolfer.com`). The placeholder is unchanged. |
| Trademark, domain and App Store check | ⚠️ **Preliminary only** | Web searches found an abandoned US “BADGOLFER” filing, and a 2022 US “BAD GOLFER” shirt filing with unknown current status. **Not legal clearance** (`docs/BRAND.md`). |
| A. Hand-specific slice, hook, push and pull wording | ✅ | `challengeLabel()` in `src/domain/profile.ts`. Right-handed and left-handed golfers see only their own direction; unknown, not sure and prefer-not-to-say get neutral wording that explains both, and nothing is guessed. Used in Goals, the profile summary and the starter-plan reasons. 6 unit tests plus E2E (right → left → unknown) |
| B. Header height, clipping, safe areas, tab bar, 44 pt targets, small screens | ✅ in Chromium | Tab screens: one compact in-screen title (the second navigator header is removed). Web stack header is 48 px (was 64) with a 44 pt Back that works after a reload. `viewport-fit=cover` with safe-area padding; `100dvh` root so Safari's toolbars cannot push the tab bar off-screen. Compact buttons are 44 pt (were 40); checkboxes have a 44 pt target. E2E at 375×667, 390×844, 430×932 and 667×375 checks: no horizontal overflow, every control ≥ 44×44, the last item scrolls clear of the tab bar or bottom inset, and the header height. **Not verified in Safari itself.** |
| C. Information density (Review, Today) | ✅ | Today is a dashboard: greeting and date, setup progress, the session outline with “Why these…” details, bag and club tiles, top goals, and a “Coming next” card. Review groups unanswered fields on one line per section instead of a badge per field. No information was removed; details are one tap away (`Disclosure`). |
| D. Accurate feature descriptions | ✅ | A single registry, `src/domain/features.ts` (available / experimental / planned + milestone), shown on Today and in Settings. Welcome copy corrected: swing analysis is *planned* for the iPhone app; cloud backup is *not available yet*. |
| E. Data preservation | ✅ | No schema change in M0.1. Storage identifiers are pinned (`storageIds.ts` plus a unit test). **Upgrade check:** fictional data entered in the merged M0 build (profile, goal, 3 clubs with brand and model, bag membership, a second bag setup, a baseline round) was all present after switching to the M0.1 build on the same origin: 12/12 checks (`scripts/check-upgrade.mjs`). This now runs in CI on every push. |
| F. Club cards and bags | ✅ | Compact cards: Brand · Model on their own line (or “Brand and model not entered”), loft and carry below, an “In bag” badge and tinted card for bag members. Bag setups show their counts (“My Bag · 9/14”), with help folded into “How bags work”. The 14-club rule and history rules are unchanged (same tests). |

Before/after screenshots (Chromium, 375×667, fictional data): [`docs/screenshots/m0.1`](docs/screenshots/m0.1).

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
| §2.1 step 7 swing videos in baseline | M1b (videos can be imported in Analyse; not yet linked to the baseline step) |
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

Environment: Linux sandbox (Node 22) plus GitHub Actions. Results for the M1a branch (which includes
M0.1).

| Check | Where | Result |
|---|---|---|
| TypeScript, ESLint | sandbox | ✅ no errors, no warnings |
| Jest: unit, real-SQLite data (incl. v2 → v3 upgrade), IndexedDB guard, native-renderer components | sandbox + CI | ✅ **17 suites, 142 tests** |
| Browser E2E, root build (Chromium; iPhone 13 + 4 viewport sizes) | sandbox + CI | ✅ **24/24** |
| Browser E2E, GitHub Pages sub-path build | sandbox + CI | ✅ **24/24** |
| Upgrade: merged M0 build → this build, same origin (schema v2 → v3) | sandbox + CI | ✅ **12/12** data checks |
| iOS JavaScript bundle | sandbox | ✅ Hermes bundle builds |
| Swift core tests, macOS (real AVFoundation + Apple Vision, real photograph) | CI macOS 26 | ✅ **9/9** |
| Swift core tests, iOS Simulator | CI | ✅ AVFoundation tests pass; 4 Vision tests **skipped** (Vision body pose unsupported on the Simulator) |
| iOS app build with GolfVision (`prebuild` + `pod install` + `xcodebuild`, Simulator, unsigned) | CI | ✅ BUILD SUCCEEDED |
| Workflow lint | sandbox | ✅ actionlint |

**Not run:**
- Anything on a physical iPhone or iPad. That includes the Photos import, the analyser on real
  swings, performance, and the native display name and icon.
- Safari/WebKit.
- The app launched on a Simulator.
- An EAS build.
- The VoiceOver and Dynamic Type audit.

## Known limitations

- The browser preview stores data in that browser only. Clearing Safari website data deletes it.
  A Home Screen web app has its own separate storage (`docs/BUILD_AND_RUN.md`).
- If two tabs are used, the stale one stops and asks for a reload (by design).
- The browser preview can never run the Apple Vision analyser.
- The bundle ID `com.example.adaptivegolfcoach` is still a placeholder, pending owner approval.
- The tagline “Get Better.” is a proposal, not approved.
- The name “BadGolfer” has had only a preliminary web check, not trademark clearance.

## Next steps

1. **Owner:** review PR #2 (M0.1) and merge it if you approve; then review PR #3 (M1a).
2. **Owner decisions:**
   - approve or decline the Apple Developer Program (US$99 a year, recurring), which is needed to
     install the iPhone app;
   - choose the bundle identifier (`docs/BRAND.md`).
3. **After that:** I set up the TestFlight build. You run the device test plan in
   `docs/M1A_SWING_ANALYSER.md` with your own clips, and M1a is accepted or fixed from your
   results. M1b does not start before you accept M1a.
