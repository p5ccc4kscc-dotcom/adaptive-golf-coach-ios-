# Adaptive Golf Coach — project instructions (owner)

> Recorded from the project owner's messages in the Claude Code session of 2026-10-19.
> Sections 1–4 and the approval conditions follow the original closely; sections 5–9 are
> condensed. The owner's original messages remain the authority.
> Section 2 notes that the technical architecture here supersedes conflicting
> SwiftUI / Xcode / Apple Vision implementation instructions in the master spec.

## 1. Role

Lead iOS application developer, software architect, computer-vision engineer and golf
coaching platform designer. Act as technical lead: plan, research, implement, test, maintain
the GitHub repository, resolve problems, implement the full master specification, explain
important decisions and limitations, track unfinished functionality, and prepare for
TestFlight and App Store distribution. Never claim a feature works unless it has been
implemented and appropriately tested.

## 2. Authoritative specification

The Adaptive Golf Coach V2 master prompt defines functionality, coaching philosophy, user
experience and progression. Preserve all functional requirements unless the owner explicitly
approves their removal. **The technical architecture below supersedes any conflicting
SwiftUI, Xcode or Apple Vision implementation instructions in the master specification.**

## 3. Mandatory development architecture

The owner has an iPhone and iPad only — no Mac, no Xcode. Use:

- React Native, Expo, TypeScript
- Expo Application Services (EAS) cloud builds
- GitHub for source control
- Compatible, researched computer vision technology
- Secure cloud-backed storage for accounts, progress and swing videos (later milestone)

Designed for native iPhone installation. Do not assume Expo Go supports every feature;
identify features needing native development builds. Apple Developer membership may be
purchased when necessary; avoid paid services during initial development where practical.

## 4. Repository

Use the existing repository (initially a Swift `.gitignore`). Update it for Expo/React
Native/TypeScript, remove unnecessary Swift configuration, keep work organised under
version control.

## 5. Essential features

Personalised onboarding (never hard-code the owner's golf information); complete club
builder with selectable tiles for all standard clubs and per-club editable category/number,
**free-text Brand**, **free-text Model**, loft, shaft, length, estimated carry/total and
other specs; a collection of owned clubs and an active bag of up to 14; mixed brands, custom
clubs and multiple saved bag configurations; a genuine, measurement-based swing analyser
(uploaded video first, live camera later) that clearly separates measured, estimated and
undeterminable values and never fabricates clubface, path, impact or ball-flight data; a
complete coaching programme (fundamentals through course management) with curated,
legitimately linked videos; evidence-based progression to mastery (never from one attempt);
automatic refresher training only on reliable evidence of regression, keeping historical
mastery; performance tracking (rounds, scores, putting, fairways, practice, club distances,
swing history, long-term progress).

## 6–9. Process, testing, costs, communication

Achievable milestones; prioritise a usable app over placeholders; do not silently defer core
requirements or replace difficult features with mocks. For each milestone: implement, run
available tests, identify and fix failures, document unresolved issues, explain what has and
has not been verified, give practical iPhone/iPad instructions. Explain purpose, cost,
alternatives and limitations before any paid service and ask for approval. Make sensible
engineering decisions independently; do not invent product requirements; challenge
unrealistic requirements.

## Conditions attached to approving the architecture (2026-10-19)

1. Verify the authoritative V2 specification is in the repository before implementing; say so
   if it cannot be accessed rather than reconstructing it.
2. Correct the iPhone preview strategy: verify current Expo SDK compatibility with Expo Go on
   iOS; provide a working, repeatable way to inspect M0 from the iPhone **without** buying
   Apple Developer membership immediately — a cloud-hosted browser preview is acceptable,
   keeping React Native/Expo as the real architecture. Do not promise a working preview until
   the full deployment process is verified.
3. Keep Apple Vision as the preferred swing-analysis engine, via a custom Expo native module
   validated with EAS cloud builds, real footage and tests. Body movement is not proof of
   clubface control, ball flight or a corrected slice. Preserve quality indicators and manual
   verification.
4. Investigate automated iOS simulator tests through EAS Workflows (costs/availability). At
   every milestone report: files changed, tests run and results, unfinished functionality,
   known limitations, iPhone viewing instructions, any action or expense required.
5. Maintain the complete progression system for all abilities; mastery needs repeatable,
   skill-specific evidence; refresher flags only on reliable evidence of regression.
6. Implement rather than repeatedly redesign. Do not require a Mac or Xcode. Commit to
   GitHub, run tests, report actual results. Do not start M1 until M0 acceptance criteria are
   met.
