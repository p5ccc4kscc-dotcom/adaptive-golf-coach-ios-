# Architecture

## Stack (decided)

| Concern | Choice | Why |
|---|---|---|
| App framework | Expo **SDK 57** (React Native 0.86, React 19.2), TypeScript strict | Owner's mandate. SDK 57 is mature; SDK 58 is three weeks old. |
| Navigation | Expo Router (file-based, `src/app/`) | Expo standard. Deep links work on web for the preview. |
| Builds | EAS Build (cloud), Continuous Native Generation (no committed `ios/`) | No Mac available. |
| Local data | **SQLite**: `expo-sqlite` on iOS; `sql.js` (WASM) in the browser preview and in tests | Relational, migratable, the same SQL everywhere. Tests run against real SQLite. |
| Swing analysis (M1) | **Apple Vision** `VNDetectHumanBodyPoseRequest` + AVFoundation, in a **custom local Expo native module** (`modules/golf-vision`, Swift), compiled by EAS | Free, on-device, offline, no model download. Logic stays in TypeScript behind a `PoseEstimator` interface so MediaPipe can be evaluated later. |
| Drawing | `react-native-svg` (original club artwork); Skia planned for the pose overlay | — |
| Tests | Jest (unit/data/component), Playwright (web E2E), Maestro on EAS (planned) | See `docs/TESTING.md`. |

## Layers

```
src/app/          routes only (thin)
src/features/     screens and feature components
src/ui/           theme, accessible primitives, ClubArt
src/services/     AppServicesProvider: opens the DB, builds repositories, unit defaults, useQuery
src/data/         SqlDriver interface → expo-sqlite / sql.js drivers; migrations; repositories
src/domain/       pure rules (no React, no SQL): catalogue, clubs, bag, profile, onboarding, starter plan, units, dates
```

Rules flow downward only. Domain code has no dependencies on React or storage.

## Key design decisions

1. **Profile facts are append-only** (`profile_fact`). Each field stores a value, a provenance
   status, the unit it was entered in and `recorded_at`. A change *supersedes* the previous
   row and never overwrites it. A missing row means `not_assessed`. A saved blank means
   `not_provided`.
2. **Club identity:** `club_instance.id` (UUID) is the ClubInstanceID. `club_type_code` is the
   generic ClubTypeID (stable code, never a display name). Two 7-irons are two instances.
3. **Bag = preset membership with history.** `club_bag_membership` rows get `removed_at`
   instead of being deleted. One preset per owner is `is_active`. The 14-club cap is checked
   inside the same transaction as the insert, for `competition` presets only.
4. **History-safe delete:** a club with distances, past bag membership or photos is archived
   (`status = archived`) and taken out of all bags. Only a club with no history is hard-deleted.
5. **Edit snapshots:** every create/update writes `club_instance_revision`, so later
   features (rounds, videos) can show a club's details as they were at the time.
6. **Owner scoping:** every user table has `owner_id`. One local owner is created per install.
   Accounts and sync (M4) will map this owner to an authenticated identity.
7. **Units:** values are stored canonically (metres, cm, degrees) along with the entered unit.
   Defaults come from the phone's measurement system and are always shown and editable.
8. **Browser preview** uses the same screens and the same SQL. `openDatabase.web.ts` loads
   sql.js from `/vendor/sqljs` (copied at install) and persists the DB file to IndexedDB after
   each committed write.

## Planned M1 swing pipeline (not yet built)

```
expo-image-picker (system picker, videos)  →  copy into app sandbox + SHA-256
  → GolfVision.probe(uri)        [Swift: AVAsset tracks, preferredTransform, real frame timestamps]
  → GolfVision.analysePose(uri)  [Swift: AVAssetReader, coarse pass then dense windows,
                                  VNDetectHumanBodyPoseRequest with correct orientation,
                                  19 joints + confidence + person count, progress events, cancel]
  → TypeScript analysis engine   [orientation/handedness normalisation, gap-aware smoothing,
                                  quality gate, view gating (DTL/FO), phase candidates with
                                  manual correction, Tier A metrics only, findings schema §4.5]
  → overlay on video (Skia), frame stepping, save/reopen offline, re-analysis kept for audit
```
Validation needs consented real swing clips supplied by the owner (see `MEASUREMENT_VALIDITY.md`).
