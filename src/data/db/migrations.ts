import { SqlDriver } from './driver';

/**
 * Ordered, append-only schema migrations. Never edit a shipped migration;
 * add a new one. Every user-data table carries `owner_id` so data stays
 * separable per golfer when accounts/sync arrive. IDs are UUID text (no
 * reliance on autoincrement or unique constraints that CloudKit-style sync
 * cannot honour).
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'm0_profile_clubs_bag',
    sql: `
CREATE TABLE app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE owner (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('local')),
  created_at TEXT NOT NULL
);

-- Display preferences (units). Owner-scoped.
CREATE TABLE user_preference (
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, key)
);

-- Append-only profile facts: the current value is the latest row per key
-- that has not been superseded. History is kept, never overwritten.
CREATE TABLE profile_fact (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  value_json TEXT,
  status TEXT NOT NULL CHECK (status IN ('not_provided','self_reported','coach_confirmed','device_measured','imported')),
  unit TEXT,
  recorded_at TEXT NOT NULL,
  superseded_at TEXT
);
CREATE INDEX idx_profile_fact_current ON profile_fact (owner_id, field_key, superseded_at);

CREATE TABLE player_goal (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  measurable_definition TEXT,
  priority INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE onboarding_progress (
  owner_id TEXT PRIMARY KEY NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  current_step TEXT NOT NULL,
  completed_steps_json TEXT NOT NULL,
  skipped_steps_json TEXT NOT NULL,
  started_at TEXT,
  updated_at TEXT,
  completed_at TEXT
);

CREATE TABLE baseline_round (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  played_on TEXT NOT NULL,
  holes INTEGER NOT NULL CHECK (holes IN (9, 18)),
  total_strokes INTEGER,
  total_putts INTEGER,
  course_name TEXT,
  source TEXT NOT NULL CHECK (source IN ('self_reported','imported')),
  notes TEXT,
  created_at TEXT NOT NULL
);

-- Generic reference data (not owned clubs), versioned with the app catalogue.
CREATE TABLE club_type_definition (
  code TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  number INTEGER,
  label TEXT NOT NULL,
  catalog_version INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  retired_at TEXT
);

CREATE TABLE club_instance (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  club_type_code TEXT NOT NULL REFERENCES club_type_definition(code),
  custom_name TEXT,
  custom_category TEXT,
  custom_description TEXT,
  brand TEXT,
  model TEXT,
  loft_deg REAL,
  loft_status TEXT NOT NULL CHECK (loft_status IN ('known','not_known','not_provided')),
  length_cm REAL,
  length_unit TEXT,
  lie_deg REAL,
  shaft_brand TEXT,
  shaft_model TEXT,
  shaft_flex TEXT,
  shaft_material TEXT,
  grip TEXT,
  condition TEXT,
  purchase_year INTEGER,
  notes TEXT,
  handedness_override TEXT,
  putter_subtype TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','archived')),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_club_instance_owner ON club_instance (owner_id, status);

-- Snapshot of a club's details each time they change, so past records can
-- show what the club looked like then. Logs reference club_instance.id.
CREATE TABLE club_instance_revision (
  id TEXT PRIMARY KEY NOT NULL,
  club_instance_id TEXT NOT NULL REFERENCES club_instance(id) ON DELETE CASCADE,
  changed_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);

CREATE TABLE club_distance_observation (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  club_instance_id TEXT NOT NULL REFERENCES club_instance(id),
  kind TEXT NOT NULL CHECK (kind IN ('carry','total')),
  method TEXT NOT NULL CHECK (method IN ('estimated','measured')),
  value_m REAL NOT NULL,
  entered_value REAL NOT NULL,
  entered_unit TEXT NOT NULL CHECK (entered_unit IN ('yards','metres')),
  observed_on TEXT NOT NULL,
  source TEXT NOT NULL,
  context TEXT NOT NULL,
  sample_count INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_distance_club ON club_distance_observation (club_instance_id);

CREATE TABLE club_bag_preset (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('competition','practice')),
  is_active INTEGER NOT NULL CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

-- Membership history: a row per period a club spent in a preset.
-- Current members have removed_at IS NULL.
CREATE TABLE club_bag_membership (
  id TEXT PRIMARY KEY NOT NULL,
  preset_id TEXT NOT NULL REFERENCES club_bag_preset(id) ON DELETE CASCADE,
  club_instance_id TEXT NOT NULL REFERENCES club_instance(id),
  added_at TEXT NOT NULL,
  removed_at TEXT
);
CREATE INDEX idx_membership_preset ON club_bag_membership (preset_id, removed_at);
CREATE INDEX idx_membership_club ON club_bag_membership (club_instance_id);

-- Golfer-supplied equipment photos (files stored locally; UI arrives with M1 media import).
CREATE TABLE equipment_photo (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  club_instance_id TEXT NOT NULL REFERENCES club_instance(id),
  relative_path TEXT NOT NULL,
  content_hash TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
  },
  {
    version: 2,
    name: 'm0_baseline_details_coach_notes_skill_baselines',
    sql: `
-- Optional hole-by-hole putts for a past round. NULL putts = not counted on that hole.
CREATE TABLE baseline_round_hole (
  id TEXT PRIMARY KEY NOT NULL,
  baseline_round_id TEXT NOT NULL REFERENCES baseline_round(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  putts INTEGER CHECK (putts IS NULL OR (putts BETWEEN 0 AND 10))
);
CREATE INDEX idx_round_hole_round ON baseline_round_hole (baseline_round_id);

-- Recent range outcomes entered as baseline. The club is a ClubInstanceID,
-- or NULL when the golfer chose "Unknown / not entered".
CREATE TABLE baseline_range_outcome (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  observed_on TEXT NOT NULL,
  club_instance_id TEXT REFERENCES club_instance(id),
  club_choice TEXT NOT NULL CHECK (club_choice IN ('bag','other_owned','unknown')),
  context TEXT NOT NULL,
  shots INTEGER NOT NULL CHECK (shots >= 1),
  successes INTEGER CHECK (successes IS NULL OR successes >= 0),
  success_definition TEXT,
  notes TEXT,
  source TEXT NOT NULL CHECK (source IN ('self_reported','imported')),
  created_at TEXT NOT NULL
);

CREATE TABLE golf_coach_note (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  coach_name TEXT,
  noted_on TEXT NOT NULL,
  text TEXT NOT NULL,
  club_instance_id TEXT REFERENCES club_instance(id),
  source TEXT NOT NULL CHECK (source IN ('self_reported','coach_confirmed')),
  created_at TEXT NOT NULL,
  archived_at TEXT
);

-- Approved personal baselines per skill/context/version. Rows are superseded, never edited.
-- Populated by the skills engine (M2).
CREATE TABLE player_skill_baseline (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  context TEXT NOT NULL,
  club_instance_id TEXT REFERENCES club_instance(id),
  camera_view TEXT CHECK (camera_view IS NULL OR camera_view IN ('dtl','fo')),
  measurement_version TEXT NOT NULL,
  provenance TEXT NOT NULL CHECK (provenance IN ('self_reported','coach_confirmed','device_measured','imported')),
  summary_json TEXT NOT NULL,
  approved_by TEXT,
  approval_rationale TEXT,
  created_at TEXT NOT NULL,
  superseded_at TEXT
);
`,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;

export async function migrate(db: SqlDriver): Promise<{ from: number; to: number }> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.get<{ user_version: number }>('PRAGMA user_version;');
  const from = Number(row?.user_version ?? 0);
  for (const m of MIGRATIONS) {
    if (m.version <= from) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.exec(`PRAGMA user_version = ${m.version};`);
    });
  }
  return { from, to: LATEST_SCHEMA_VERSION };
}
