# Data dictionary (schema v1)

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

## Profile field keys

`displayName, playingHand, abilityLevel, yearsPlayed, handicap {value, kind official|estimated}, usualRounds, practiceTypes[], typicalPracticeMinutes, ageRange, heightCm, wristToFloorCm, movementComfort, practiceVolume, transport, accessibilityNeeds, comfortNotes, challenges[], challengesOther, playFrequency, indoorSpaceM, practiceAids[], surfaceAccess[], coachName, coachNotes, upcomingEvents, existingLessonFocus`

Sensitive (never logged): height, wrist-to-floor, movement comfort, accessibility, comfort notes, age range, coach details.

## Export format

`{ format: "adaptive-golf-coach-export", formatVersion: 1, exportedAt, ownerId, tables: { <table>: rows[] } }`. Plain JSON, no lock-in. Import arrives in M3.
