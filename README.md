# BadGolfer

**BadGolfer — Get Better.** _(proposed tagline)_

A private, evidence-based golf coaching app for iPhone, built with **React Native + Expo +
TypeScript** and compiled in the cloud with **EAS** (no Mac or Xcode needed).

Every golfer starts from a **blank profile** and enters their own information. Nothing about any
real person is built in. Unknown values stay unknown. The app will not invent measurements,
distances, scores or swing faults.

Every golfer has something to work on, from a first lesson to a scratch handicap. The name is
self-aware, not a label. See [`docs/BRAND.md`](docs/BRAND.md).

> Status: **M0 is accepted** by the owner for the Safari browser-preview scope. **M0.1** (BadGolfer
> branding and iPhone layout fixes) is in review. Native iOS is not yet validated. Swing analysis
> (M1a) and cloud backup are not available yet. See [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md).
>
> The repository keeps its original name (`adaptive-golf-coach-ios-`), and the original storage names
> are kept so that saved data is never orphaned.

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
- Optional baseline:
  - past rounds, with putts as a total or hole by hole (blank holes stay “not recorded”, never 0);
  - recent range sessions, choosing the club from your bag, another owned club, or “Unknown”;
  - dated coach notes.
- **My Clubs** (owned, as a list or a grouped visual grid) is kept separate from **My Bag** (active):
  - a competition bag holds at most 14 clubs, and a 15th is refused with a swap offer;
  - practice selections can be larger and are labelled as such;
  - named bag presets, swap and clear;
  - clubs that have history are archived on delete rather than erased.
- Local private storage: SQLite on iPhone; in the browser preview, SQLite (WebAssembly) saved
  in that browser. A second, out-of-date tab can never overwrite newer data; it asks for a reload.
  JSON export and **Delete all my data** are included, and the sync status says plainly that
  nothing is backed up yet.
- **Swing analyser (M1a prototype, iPhone app only, not yet tested on a real iPhone):**
  - import from Photos;
  - on-device Apple Vision body tracking with exact frame times;
  - joint overlay on the exact frames, with scrubbing;
  - swing-phase candidates with uncertainty, which you can correct;
  - 2D measurements labelled by basis, and two-swing comparison.

  It never measures the club, the face or the ball. See [`docs/M1A_SWING_ANALYSER.md`](docs/M1A_SWING_ANALYSER.md).
- Learn and Rounds show clearly labelled **“Not available yet”** cards, as does Analyse in the browser. No sample or
  fake analysis is shown anywhere. Settings and Today list what is available, experimental or planned.

## Viewing it on your iPhone

See [`docs/BUILD_AND_RUN.md`](docs/BUILD_AND_RUN.md). In short:

1. **Browser preview (free, no Apple membership):** open
   `https://p5ccc4kscc-dotcom.github.io/adaptive-golf-coach-ios-/` in Safari. It is redeployed on
   every merge to `main`.
2. **Real iPhone app:** this needs the Apple Developer Program (US$99/year). It is first
   required in M1, for the on-device swing analyser.

Screenshots from the automated browser tests: [`docs/screenshots/m0`](docs/screenshots/m0), and the M0.1 before/after set in [`docs/screenshots/m0.1`](docs/screenshots/m0.1).

## Developer commands

```bash
npm install            # also copies the sql.js browser build into public/vendor
npm run typecheck      # TypeScript
npm run lint           # ESLint (expo lint)
npm test               # Jest: domain + real-SQLite data tests + native component tests
npm run export:web     # build the browser preview into dist/
npm run test:e2e       # Playwright end-to-end tests against dist/ (Chromium, iPhone-sized)
npm run export:pages && npm run test:e2e:pages   # same, for the GitHub Pages sub-path build
node scripts/check-upgrade.mjs <old-dist> <new-dist>  # data saved by an old build survives a new one
npm run brand:icons    # re-render the icon set from assets/brand/*.svg
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
modules/golf-vision Local Expo module (Swift): AVFoundation + Apple Vision, with macOS tests
.eas/, .maestro/    Planned iOS-simulator E2E (not yet run)
docs/               Architecture, build/run, testing, data dictionary, privacy, spec copies
```

Not affiliated with or endorsed by any golf organisation, coach, equipment maker or Apple.
