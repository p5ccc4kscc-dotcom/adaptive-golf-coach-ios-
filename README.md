# Adaptive Golf Coach (working name)

A private, evidence-based golf coaching app for iPhone, built with **React Native + Expo +
TypeScript** and compiled in the cloud with **EAS** (no Mac or Xcode needed).

Every golfer starts from a **blank profile** and enters their own information. Nothing about any
real person is built in. Unknown values stay unknown. The app will not invent measurements,
distances, scores or swing faults.

> Status: **M0 (foundation) is implemented.** It covers onboarding, the full club catalogue,
> per-club Brand/Model, My Clubs, Build My Bag and local persistence. The swing analyser (M1) has
> not been started. See [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md).

## What works today (M0)

- An 8-step, fully skippable onboarding: Welcome → About your golf → Comfort → Tendencies &
  goals → Practice → Clubs → Baseline → Review. You can resume where you left off after a
  relaunch, and edit any answer later under My Game.
- A **Club Face Gallery** with 55 club types, each shown as its own tile with original artwork:
  drivers, 2–11 woods, 1–9 hybrids, 1–9 driving/utility irons, 1–9 irons, named wedges,
  wedge-by-loft, stamped wedges such as “W”, chippers, putters and custom clubs.
- **Brand and Model text boxes on every individual club**, plus optional loft (or “not known”),
  length, lie, shaft, grip, condition, purchase year, notes and handedness override.
- Per-club distance records: estimated or measured, carry or total, with source, context,
  date and number of shots.
- **My Clubs** (owned) is kept separate from **My Bag** (active):
  - a competition bag holds at most 14 clubs, and a 15th is refused with a swap offer;
  - practice selections can be larger and are labelled as such;
  - named bag presets, swap and clear;
  - clubs that have history are archived on delete rather than erased.
- Local private storage: SQLite on iPhone; in the browser preview, SQLite (WebAssembly) saved
  in that browser. JSON export and **Delete all my data** are included.
- Analyse, Learn and Rounds show clearly labelled **“Not available yet”** cards. No sample or
  fake analysis is shown anywhere.

## Viewing it on your iPhone

See [`docs/BUILD_AND_RUN.md`](docs/BUILD_AND_RUN.md). In short:

1. **Browser preview (free, no Apple membership):** once an `EXPO_TOKEN` secret is added to this
   repo, GitHub Actions publishes the app to an `expo.app` web address. You open that address
   in Safari. *That deployment has not been verified yet* (see the doc).
2. **Real iPhone app:** this needs the Apple Developer Program (US$99/year). It is first
   required in M1, for the on-device swing analyser.

Screenshots from the automated browser tests are in [`docs/screenshots/m0`](docs/screenshots/m0).

## Developer commands

```bash
npm install            # also copies the sql.js browser build into public/vendor
npm run typecheck      # TypeScript
npm run lint           # ESLint (expo lint)
npm test               # Jest: domain + real-SQLite data tests + native component tests
npm run export:web     # build the browser preview into dist/
npm run test:e2e       # Playwright end-to-end tests against dist/ (Chromium, iPhone-sized)
npx expo start         # dev server (needs a computer; not required for the owner)
```

## Project layout

```
src/app/            Expo Router screens (tabs, onboarding/[step], clubs/*, bag, profile/[section])
src/domain/         Pure TypeScript rules: catalogue, clubs, bag, profile, onboarding, starter plan
src/data/           SQL driver (expo-sqlite / sql.js), migrations, repositories
src/features/       Screen components (onboarding steps, clubs, profile, today)
src/ui/             Theme, accessible components, original club artwork
tests/              unit/, data/ (real SQLite), ui/ (native renderer), fixtures/ (fictional only)
e2e/                Playwright browser tests
.eas/, .maestro/    Planned iOS-simulator E2E (not yet run)
docs/               Architecture, build/run, testing, data dictionary, privacy, spec copies
```

Not affiliated with or endorsed by any golf organisation, coach, equipment maker or Apple.
