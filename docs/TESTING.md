# Testing

## Layers

| Layer | Tool | Runs where | What it proves | What it does **not** prove |
|---|---|---|---|---|
| Domain unit tests (`tests/unit`) | Jest (Node) | sandbox + GitHub Actions | Catalogue, validation, bag rules, onboarding transitions, units, dates, starter plan, no seeded fixtures | UI behaviour |
| Data tests (`tests/data`) | Jest + **real SQLite** (sql.js WASM) | sandbox + CI | Migrations, repositories, relaunch persistence (DB bytes reopened), history-safe archive, presets, 14-club rule, export/delete | expo-sqlite native driver specifically (same SQL, different binding) |
| Component tests (`tests/ui`) | Jest + React Native Testing Library (`jest-expo/ios` preset) | sandbox + CI | Native-renderer accessibility labels/states for chips and the club gallery | Real device rendering |
| Browser E2E (`e2e/`) | Playwright, Chromium, iPhone 13 viewport, against the exported web build | sandbox + CI | Full user journeys through the real screens, including reload persistence | Safari/WebKit, iOS, native modules |
| Swift core tests (`modules/golf-vision/ios/Tests`) | `swift test` on GitHub's macOS runner | CI “iOS native (macOS)” | Real AVFoundation + Apple Vision: metadata, exact timestamps, sampling, orientation for 0/90/180/270°, detection on a real photograph, no false person on empty video, cancellation, errors | iPhone hardware, real swings |
| Swift core tests on the iOS Simulator | `xcodebuild test` | CI | AVFoundation parts on iOS. Vision body pose is **not supported on the Simulator**, so those tests are skipped there and say so | Vision on iOS |
| iOS app build with the native module | `expo prebuild` + `pod install` + `xcodebuild` (Simulator, unsigned) | CI | The Swift module compiles and links into the Expo SDK 57 app | That the app runs; anything on a device |
| iOS simulator E2E (`.maestro/`, `.eas/workflows/e2e-ios-simulator.yml`) | Maestro on EAS Workflows | **not yet run** | Would prove the native iOS build launches and core flows work | Physical-device behaviour, camera/Photos |
| Layout checks (`e2e/m01.spec.ts`) | Playwright at 375×667, 390×844, 430×932, 667×375 | sandbox + CI | No horizontal overflow, every control ≥ 44×44, last content clear of the tab bar or bottom inset, compact headers, Back after a reload | Safari's real toolbar behaviour, Dynamic Type |
| Upgrade check (`scripts/check-upgrade.mjs`, CI job “Upgrade keeps saved data”) | Playwright + two web builds on one origin | sandbox + CI | Data entered in the `main` build is still present and unchanged in this commit's build (as on a Pages redeploy) | Native app upgrades (the SQLite file on iPhone) |
| Physical iPhone checks | You, following a checklist per build | from M1 | Real device behaviour | — |

## EAS Workflows iOS simulator tests — investigation (2026-10-19)

- Expo documents an `e2e-test` build profile with `"withoutCredentials": true` and
  `"ios": { "simulator": true }`. A simulator build needs **no Apple Developer membership**.
  This profile is in `eas.json`.
- A workflow builds the simulator app, then a `type: maestro` job runs flows from `.maestro/`.
  This is drafted in `.eas/workflows/e2e-ios-simulator.yml`, with two flows.
- **Unknown/unverified:** whether Maestro jobs and iOS simulator builds are included on the
  Expo **Free** plan, and at what monthly quantity. Expo’s pricing page could not be reached
  from the sandbox. Third-party reports (not authoritative) suggest teams run Maestro on EAS
  on the US$19/month Starter plan.
- To try it: create the Expo account (also needed for the browser preview), link this GitHub
  repo under project settings → GitHub, then run the workflow manually. Check
  **expo.dev → Billing** before and after the first run.

## Results

See `IMPLEMENTATION_STATUS.md` → “Test results”.

The upgrade check drives the *older* build's screens by their test IDs. If a later change renames a
test ID used there, update the script in the same pull request; don't delete the check.

## CI incident: intermittent browser-test failures (2026-10-19)

**Symptoms.** After a docs-only commit, both CI checks on PR #1 went red. CI runs 3, 4 and 6 failed
(run 3 on push, runs 4 and 6 on the pull request). Each time only
*“unusual clubs: ‘W’ wedge … archive keeps history”* failed:

- in run 3 the page after navigating to `/clubs` lacked the **56° wedge**;
- in runs 4 and 6 it lacked the **“W” wedge**.

Every other test passed in the same jobs.

**Evidence gathered.**

| Check | Result |
|---|---|
| Local suite, normal speed | 30/30 passed |
| Local suite, CPU throttled 4–8× | 25+/25+ passed |
| Temporary CI stress workflow | 96/96 passed |
| CI with per-test diagnostics, 4 runs | all passed |

The diagnostics are now permanent: console errors, page errors, failed requests, navigations, and
page snapshots and traces on failure. Full CI log archives could not be downloaded from the sandbox,
and no failure has yet been captured with diagnostics on.

**Root causes established.**

1. *Test defect (certain).* The test tapped **Save**, then navigated to `/clubs` immediately, with
   no wait for the save to finish. On a slow runner the page could be left before the club was
   written, which explains the missing 56° wedge. Two other actions were also not awaited, so the
   next step could start too early.
   **Fix:** every save that is followed by a navigation or a dependent action now waits for a
   visible completion signal (the form closing, or the state badge changing).
2. *Test robustness (likely cause of the “W” failures, not proven).* In those runs every step
   completed normally and the save succeeded, yet “Wedge stamped ‘W’” was absent. That is exactly
   what happens if the tap lands on a neighbouring template tile, e.g. “Custom / other club”: its
   form also has a name box, so typing “W” saves a custom club named “W” and the label check fails.
   A layout shift at the moment of the tap could cause that.
   **Fix:** tests now verify that the form for the intended club type opened (`openClubForm`,
   using a `club-form-type-<code>` marker) before typing, so a mis-tap fails immediately with a
   trace instead of surfacing later as a missing club.
3. *App weakness found during the investigation (real, fixed).* Each browser page held its own
   in-memory database and saved the whole file to IndexedDB, last writer wins. An instance with an
   out-of-date copy could silently overwrite newer data: a second tab, a page restored by the back
   button, or a page still saving while a new one loads. Tracing the single-tab test flow shows
   this does **not** explain the “W” runs, but it is a genuine data-loss risk for the golfer.
   **Fix:** revision-guarded saves (`src/data/db/idbStore.ts`).
   - A save based on an older revision is refused, and the page shows **“Reload needed”**.
   - Pragma-only statements no longer save, so opening the app never makes another tab stale.
   - Covered by unit tests against a real IndexedDB implementation (fake-indexeddb), including a
     two-instance scenario, and by a two-tab browser test (`e2e/storage.spec.ts`).

**Not claimed.** The “W” failure was never captured with diagnostics, so cause 2 is the best-supported
explanation, not a proven one. If any browser test fails again, CI now prints the
page snapshot and the browser console, and keeps the trace for 7 days.
