# Privacy & security

## Current behaviour

- **No network use by the app.** No analytics, crash reporting, accounts or cloud sync. (The
  browser preview's files are served from the hosting provider; your data is not sent to it.)
- **Storage:**
  - iPhone app: SQLite file in the app's private sandbox, covered by iOS data protection.
  - Browser preview: IndexedDB in that browser only.
- **No device permissions requested.** Photos/video access arrives in M1 via the system picker,
  which grants access to the chosen clip only.
- **Golfer controls:** export all data as JSON, and *Delete all my data*, which removes every
  owner-scoped row.
- Body measurements and comfort/accessibility notes are optional, marked sensitive, and never
  used to calculate club specifications or medical judgements. Height and wrist-to-floor have an
  explicit “I don't know”. No age question is asked: the spec allows one only for a demonstrated
  coaching purpose, and none exists yet.
- **iOS file protection:** the app requests the `NSFileProtectionComplete` default data-protection
  entitlement, so its files are encrypted while the device is locked. This is set in `app.json` and
  is **not yet verified** in an EAS build.
- No secrets are in the repository. The repository is **public**: never commit personal golf data, real swing videos, credentials or tokens. Fixtures are fictional. Any `EXPO_TOKEN` lives only in GitHub Actions secrets.

## Swing videos (M1a, iPhone app only)

| What | Where it lives | Leaves the device? | Removed by |
|---|---|---|---|
| Original video | Your Photos library | — (BadGolfer never changes it) | You, in Photos |
| BadGolfer's private copy | App sandbox: `Documents/swing-videos/<random id>.<ext>` | **No.** Never uploaded; no network call is made by the analyser | “Delete this video from BadGolfer”, **Delete all my data**, or deleting the app |
| Picker's temporary copy | App sandbox: `Library/Caches/ImagePicker/` | No | Deleted straight after the private copy is made; also by Delete all my data |
| Extracted frame images (viewer) | App sandbox: `Library/Caches/golfvision-frames/` | No | Deleting any video, Delete all my data, or iOS clearing caches |
| Analyses, phase marks, landmarks | The app's SQLite database | No (only in a JSON export you choose to share) | Deleting the video (all of its runs) or Delete all my data |

- **No other app can read these files.** With the `NSFileProtectionComplete` entitlement they are
  encrypted while the iPhone is locked (on-device check: D-P3 in the device test plan).
- **Backups.** Like any app's documents, the private copies are included in **your own** iPhone
  backup (iCloud Backup or a computer backup), which only you can restore. BadGolfer adds no cloud
  copy of its own.
- **Export.** The JSON export contains analysis records and landmark coordinates, never the
  video file.
- **The test photograph** used by CI is a public test image, downloaded at test time and never
  stored in the repository. No real person's swing video is committed, and none must be.
- **Verified by:**
  - `tests/data/swing.test.ts`: deleting a video removes its records, all its runs, marks and
    landmarks, and nothing else; Delete all my data clears every swing table;
  - `tests/ui/swingFiles.test.tsx`: the right files are deleted, with the file system simulated.

  On the iPhone this is checked with **Settings → Swing videos stored on this iPhone** (device
  tests D-P1 and D-P2). It is **not yet verified on a device**.

## Before any public release (not done)

- Privacy policy, App Store privacy “nutrition label”, UK GDPR review by a qualified person. This
  project does **not** claim legal compliance.
- Data-retention and account-deletion flows once accounts exist (M4).
- Decide the video backup provider with explicit opt-in; videos are sensitive personal media.
