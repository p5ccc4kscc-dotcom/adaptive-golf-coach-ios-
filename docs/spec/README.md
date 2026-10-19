# Specification documents

| File | What it is | Status |
|---|---|---|
| [`adaptive_golf_coach_codex_master_prompt_v2.md`](adaptive_golf_coach_codex_master_prompt_v2.md) | The owner's original **V2 master specification**, supplied on 2026-10-19 and stored exactly as received. | **Authoritative** for all functional requirements |
| [`PROJECT_INSTRUCTIONS.md`](PROJECT_INSTRUCTIONS.md) | The owner's project instructions (role, mandatory Expo architecture) and the conditions attached to approving the architecture. | Authoritative for the technical architecture |

## Reconciliation record (2026-10-19)

The earlier repository copy (`MASTER_SPEC_V2.md`) had been transcribed from chat and marked *unverified*.
The two texts were compared word by word after normalising only typography (curly versus straight quotes,
bullet characters, Markdown emphasis and separators): **9,246 words each, no wording differences.**
No requirement had been missing or changed. The transcription has been removed, and the original above is
now the only spec file.

## Precedence

1. `PROJECT_INSTRUCTIONS.md`'s technical architecture (React Native + Expo + TypeScript + EAS)
   **supersedes** the spec's SwiftUI / SwiftData / Xcode / XCTest instructions (spec §1.1, §8, §10 M0
   "Xcode project", §15.1). This is the owner's approved override.
2. Every *functional* requirement in the original spec remains in force unless the owner explicitly
   approves its removal.
3. Translations used by the code:
   - "SwiftData" → SQLite via expo-sqlite (sql.js in the browser preview).
   - "XCTest/XCUITest" → Jest + React Native Testing Library + Playwright (web), with Maestro on the iOS
     simulator planned.
   - "Xcode project" → an Expo project built by EAS (native folders are generated, not committed).
   - Apple Vision remains the pose engine, via a custom Expo native module (M1).
4. M0-scope differences and their status are tracked in
   [`IMPLEMENTATION_STATUS.md`](../../IMPLEMENTATION_STATUS.md#differences-from-the-v2-specification).
