# Competency rules (applies from M2)

Not implemented in M0. Requirements carried from the spec (§5) for the M2 engine:

- States `locked → available → learning → practising → assessment_ready → proficient → mastered`,
  with non-destructive flags `needs_reassessment`, `refresher_recommended`, `coach_locked`, `paused`.
  Changes are stored as events, never overwritten. `contentCompletedAt` is separate from `masteredAt`.
- Mastery needs repeatable, skill-specific evidence. The default principle: the target is met on
  at least **three valid, separately dated sessions across about 14 days**, plus a transfer test
  where relevant. Watching a lesson, one good swing or a quiz never passes a skill.
- Refresher only after **two or more materially worse comparable assessments on distinct
  sessions**, plus negative outcomes or a coach confirmation, with enough samples. One
  low-confidence clip results in `insufficient_evidence`. One reliable anomaly results in
  `monitoring` only. Mastery history is always kept.
- Benchmarks (e.g. Driver A1 12/20 playable, Putting P1 7/10 from 3–5 ft) are configurable,
  versioned **training hypotheses**, not universal standards. Coach overrides record author,
  rationale and date.
- Experienced golfers can test out of beginner content with honest assessments.
