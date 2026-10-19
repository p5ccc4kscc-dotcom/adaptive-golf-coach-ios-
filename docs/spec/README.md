# Specification documents

| File | What it is | Status |
|---|---|---|
| `MASTER_SPEC_V2.md` | The "Codex master build prompt — Adaptive Golf Coach (general-user edition)", transcribed from the text the project owner pasted into the Claude Code session on 2026-10-19. | **Unverified copy.** When this file was created the repository did not contain any specification, and no newer "V2" document could be found. Replace this file with your authoritative version if it differs. |
| `PROJECT_INSTRUCTIONS.md` | The owner's project instructions (role, mandatory Expo architecture) and the conditions attached to approving the architecture. | Recorded from the same session (sections 5–9 condensed). |

## Precedence

1. `PROJECT_INSTRUCTIONS.md` technical architecture (React Native + Expo + TypeScript + EAS)
   **supersedes** any SwiftUI / SwiftData / Xcode / XCTest instructions in the master spec.
2. All *functional* requirements in `MASTER_SPEC_V2.md` remain in force unless the owner
   explicitly approves removing one.
3. Where the spec says "SwiftData", read "SQLite via expo-sqlite"; "XCTest/XCUITest", read
   "Jest + React Native Testing Library + Playwright (web) + Maestro (iOS simulator, planned)".
   Apple Vision remains the preferred pose engine, via a custom Expo native module (M1).
