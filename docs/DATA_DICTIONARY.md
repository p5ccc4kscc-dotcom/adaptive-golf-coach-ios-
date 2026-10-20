# Data dictionary (schema v3)

All timestamps are UTC ISO-8601 text. Calendar dates the golfer sees (`played_on`,
`observed_on`) are local `YYYY-MM-DD` in the golfer's own time zone. IDs are UUID text.

| Table | Purpose | Key columns |
|---|---|---|
| `app_meta` | Install-level settings | `local_owner_id`, `club_catalog_version` |
| `owner` | The local profile owner (one per install in this release) | `id`, `kind='local'` |
| `user_preference` | Units | `distanceUnit` yards/metres, `clubLengthUnit` in/cm, `heightUnit` cm/ft_in, `unitsConfirmed` |
| `profile_fact` | Append-only profile answers | `field_key`, `value_json` (null = blank), `status` (`not_provided`/`self_reported`/`coach_confirmed`/`device_measured`/`imported`), `unit`, `recorded_at`, `superseded_at` |
| `player_goal` | Ordered goals | `text`, `measurable_definition`, `priority`, `status` |
| `onboarding_progress` | Resume state | `status` (`not_started`/`in_progress`/`completed`/`explored_empty`), `current_step`, completed/skipped step lists |
| `baseline_round` | Self-reported past rounds | `holes` 9/18, `total_strokes` nullable, `total_putts` nullable (**null = not recorded, never 0**), `source` |
| `club_type_definition` | Generic reference catalogue (not owned clubs) | `code` (stable PK), `category`, `number`, `label`, `catalog_version`, `retired_at` |
| `club_instance` | An owned club | `club_type_code`, `custom_name`, `custom_category`, `brand`, `model`, `loft_deg` + `loft_status` (`known`/`not_known`/`not_provided`), `length_cm` + `length_unit`, `lie_deg`, shaft/grip/condition/year/notes, `handedness_override`, `putter_subtype`, `status` active/archived |
| `club_instance_revision` | Snapshot per create/edit | `snapshot_json`, `changed_at` |
| `club_distance_observation` | Per-club distance record | `kind` carry/total, `method` estimated/measured, `value_m` (canonical), `entered_value` + `entered_unit`, `observed_on`, `source`, `context`, `sample_count` nullable, `deleted_at` (soft) |
| `club_bag_preset` | Named bag | `name`, `kind` competition/practice, `is_active`, `archived_at` |
| `club_bag_membership` | Club-in-bag periods | `preset_id`, `club_instance_id`, `added_at`, `removed_at` (null = currently in bag) |
| `equipment_photo` | Golfer's own club photos (UI in M1) | `relative_path`, `content_hash`, `deleted_at` |
| `baseline_round_hole` *(v2)* | Optional hole-by-hole putts for a baseline round | `hole_number` 1–18, `putts` nullable (**null = not counted on that hole**) |
| `baseline_range_outcome` *(v2)* | Recent range sessions entered as baseline | `club_choice` bag/other_owned/unknown, `club_instance_id` (ClubInstanceID or null), `context`, `shots`, `successes` nullable, `success_definition`, `source` |
| `golf_coach_note` *(v2)* | GolfCoachNote: dated notes from a coach | `coach_name`, `noted_on`, `text`, `club_instance_id`, `source` (`self_reported` when typed by the golfer), `archived_at` |
| `swing_video` *(v3)* | An imported swing video (private copy; Photos original untouched) | `relative_path` (relative to the app's documents folder; iOS moves the container on updates), `original_file_name`, metadata read from the file (`duration_s`, `display_width/height`, `rotation_deg`, `nominal_fps`, `estimated_frame_count`, `codec`, `file_size_bytes`), golfer context (`camera_view` fo/dtl/other, `playing_hand`, `club_choice` bag/other_owned/unknown + `club_instance_id`, `shot_type`; **NULL = not chosen**), `archived_at` |
| `pose_analysis` *(v3)* | One analyser run (completed, failed or cancelled; runs are never overwritten) | `engine` (`apple_vision_body_pose_2d`), `engine_version` (Vision revision), `app_version`, `params_json` (sampling plan, window, thresholds), `status`, `error_code/message`, `frames_analysed`, `decoded_frames`, `truncated`, `processing_s`, `quality_json`, `phases_json` (automatic candidates) |
| `pose_phase_mark` *(v3)* | Phases the golfer marked by hand; append-only (`superseded_at`) | `pose_analysis_id`, `phase`, `frame_index`, `time_s` |
| `pose_frame_data` *(v3)* | Detected landmarks of a completed run, as Vision returned them (4 dp) | `format_version`, `joint_order_json`, `frames_json` (`t` time s, `i` decoded frame index, `n` people, `p` 19 × x, y, confidence; missing = −1, −1, 0) |
| `player_skill_baseline` *(v2)* | PlayerSkillBaseline: approved per-skill baseline (populated by M2) | `skill_id`, `level`, `context`, `club_instance_id`, `camera_view`, `measurement_version`, `provenance`, `summary_json`, `approved_by`, `approval_rationale`, `superseded_at` |

## Profile field keys

`displayName, playingHand, abilityLevel, yearsPlayed, handicap {value, kind official|estimated}, usualRounds, practiceTypes[], typicalPracticeMinutes, heightCm, wristToFloorCm, movementComfort, practiceVolume, transport, accessibilityNeeds, comfortNotes, challenges[], challengesOther, playFrequency, indoorSpaceM, practiceAids[], surfaceAccess[], coachName, upcomingEvents, existingLessonFocus`

Removed before release: `ageRange` (the spec allows it only with a demonstrated coaching purpose, and nothing used it) and `coachNotes` (replaced by dated `golf_coach_note` records).

Sensitive (never logged): height, wrist-to-floor, movement comfort, accessibility, comfort notes, coach details and notes.

## Storage identifiers (kept through the BadGolfer rename)

`src/data/db/storageIds.ts` keeps the original working name in the IndexedDB database name, the iPhone
SQLite file name (`adaptive-golf-coach.db`) and the export `format` tag. These are internal and never
shown to golfers. Changing them would orphan saved data, and `tests/unit/storageIds.test.ts` fails if
they change.

## Export format

formatVersion **3** adds `swing_video`, `pose_analysis`, `pose_phase_mark` and `pose_frame_data`. Video files themselves are not included in the JSON.


`{ format: "adaptive-golf-coach-export", formatVersion: 2, exportedAt, ownerId, tables: { <table>: rows[] } }`. Plain JSON, no lock-in. Import arrives in M3.

## Browser-preview storage keys (IndexedDB `adaptive-golf-coach` → store `sqlite`)

- `main-db`: the complete SQLite file.
- `main-db-rev`: an integer revision. Every save must state the revision it was based on. A save based
  on an older revision is refused (`StaleWriteError`), so an out-of-date tab can never overwrite newer data.
