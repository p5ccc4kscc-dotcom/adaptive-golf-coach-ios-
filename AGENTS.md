# Rules for coding agents working on this repository

This is an Expo / React Native / TypeScript app for iPhone, built in the cloud with EAS. The
owner has no Mac. Read `docs/spec/README.md` first. The functional spec is
`docs/spec/MASTER_SPEC_V2.md`, and the architecture overrides are in
`docs/spec/PROJECT_INSTRUCTIONS.md`.

## Non-negotiables

- **No seeded personal data.** Production code must not contain any real or sample golfer's
  name, clubs, distances, scores, handicap or faults. Fictional fixtures live only in
  `tests/fixtures/`. `tests/unit/noProductionFixtures.test.ts` enforces this.
- **Unknown stays unknown.** Use `null` plus a provenance status (`not_assessed`,
  `not_provided`, `self_reported`, …), never 0 or a guess. Never infer loft from a type or
  brand. Never assume a default distance.
- **Unbuilt features are labelled.** Use `<NotAvailable milestone=…/>`. Never show mock
  analysis, fake metrics or placeholder skeletons as real.
- **Pose video never measures** clubface, path, face-to-path, speeds, spin, carry or strike
  location (spec §4.4 Tier C).
- **History is never rewritten.** Profile facts are superseded, not overwritten. Clubs with
  history are archived, not deleted. Bag membership keeps removed rows.
- My Clubs (owned) is separate from My Bag (preset membership). The 14-club cap applies only
  to `competition` presets.

## Code conventions

- Business rules live in `src/domain/` as pure functions with unit tests. Repositories
  (`src/data/repositories`) are the only code that writes SQL.
- Schema changes: **append** a migration in `src/data/db/migrations.ts`. Never edit a shipped
  migration. Every user table carries `owner_id` and uses UUID text ids.
- Expo APIs change every SDK. Check the installed version (`expo` in package.json, currently
  SDK 57) and read the versioned docs. `docs.expo.dev` may be blocked in the agent sandbox;
  raw docs are available from `raw.githubusercontent.com/expo/expo/main/docs/pages/...`.
- Install Expo packages with `npx expo install` (set `EXPO_OFFLINE=1` if expo.dev is unreachable).
- Routes live only in `src/app/`. Never hand-edit `ios/` or `android/` (they are generated).
- Accessibility: every control needs a meaningful `accessibilityLabel`. Selectable chips set
  `accessibilityState` and `aria-checked`. Keep tap targets at least 44 pt.
- British English in UI copy. Respect device locale for dates and the golfer's unit choices.

## Before you claim something is done

```bash
npm run typecheck && npm run lint && npm test && npm run export:web && npm run test:e2e
```

Report the real output. Browser E2E runs in Chromium; it is **not** an iOS or Safari test.
Native-only code (expo-sqlite, future Vision module) needs an EAS build and on-device checks.
