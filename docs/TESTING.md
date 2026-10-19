# Testing

## Layers

| Layer | Tool | Runs where | What it proves | What it does **not** prove |
|---|---|---|---|---|
| Domain unit tests (`tests/unit`) | Jest (Node) | sandbox + GitHub Actions | Catalogue, validation, bag rules, onboarding transitions, units, dates, starter plan, no seeded fixtures | UI behaviour |
| Data tests (`tests/data`) | Jest + **real SQLite** (sql.js WASM) | sandbox + CI | Migrations, repositories, relaunch persistence (DB bytes reopened), history-safe archive, presets, 14-club rule, export/delete | expo-sqlite native driver specifically (same SQL, different binding) |
| Component tests (`tests/ui`) | Jest + React Native Testing Library (`jest-expo/ios` preset) | sandbox + CI | Native-renderer accessibility labels/states for chips and the club gallery | Real device rendering |
| Browser E2E (`e2e/`) | Playwright, Chromium, iPhone 13 viewport, against the exported web build | sandbox + CI | Full user journeys through the real screens, including reload persistence | Safari/WebKit, iOS, native modules |
| iOS simulator E2E (`.maestro/`, `.eas/workflows/e2e-ios-simulator.yml`) | Maestro on EAS Workflows | **not yet run** | Would prove the native iOS build launches and core flows work | Physical-device behaviour, camera/Photos |
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

## Results for M0 (this commit)

See `IMPLEMENTATION_STATUS.md` → “Test results”.
