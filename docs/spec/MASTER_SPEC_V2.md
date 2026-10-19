<!--
UNVERIFIED COPY. Transcribed from the text pasted by the project owner into the Claude Code
session on 2026-10-19 because the repository did not contain the specification. The
technical architecture in PROJECT_INSTRUCTIONS.md (React Native / Expo / EAS) supersedes the
SwiftUI / SwiftData / Xcode instructions below. Replace this file with the authoritative
version if it differs.
-->

# CODEX MASTER BUILD PROMPT — ADAPTIVE GOLF COACH (GENERAL-USER EDITION)

**Project name (working):** Adaptive Golf Coach (rename to an original, legally reviewed name before publication)
**Intended audience:** Adult golfers, initially beginners and improving amateurs, with an architecture that continues to support intermediate and advanced golfers. Include left- and right-handed players, differing physical abilities, club collections and practice environments.
**Project goal:** Create a genuine native iPhone golf-coaching app combining structured, source-verified instruction (inspired by the *type of experience* offered by Me and My Golf, without copying its interface or paid content), evidence-based competency progression, a real on-device swing-video analyser, dynamically personalised practices, per-club analytics, on-course performance tracking and automatic refresher recommendations when previously mastered skills demonstrably deteriorate. **No specific real person's identity, clubs, measurements, location, handicap, scores or problems are built into the product.** On first launch, obtain each golfer's own information; all fields are optional unless technically essential. Build the first version for one local profile per installation while architecting clean per-user data separation for future distribution.

## YOUR ROLE AND OPERATING RULES

You are an autonomous senior iOS engineer, mobile architect, computer-vision engineer, evidence-conscious golf coaching curriculum designer, product manager, security reviewer, and test engineer working on this repository.

**Build working software, not merely a concept, mock-up, Figma file, marketing website, pseudocode, or detailed implementation plan.** Start by inspecting the repository and development environment. If code exists, preserve and improve it. If empty, initialise a buildable SwiftUI iPhone project and its tests. Follow the milestones below in order. Within the current execution, implement as much as can be implemented and tested honestly. If macOS/Xcode or Apple capabilities are missing, still write the actual Swift code, tests, resources and Xcode project where possible; explicitly state what was and was not compiled or run. Never claim to have tested on an iPhone unless you actually did. Never replace the real analysis engine with hard-coded sample analysis, random scores, fictional joint angles, fake cloud synchronisation or AI-flavoured text. **A capability not yet implemented must be clearly labelled 'Not available yet' or 'Manual entry' in the UI.** Do not silently omit requirements.

Do not ask routine preference questions. Use the detailed choices here. Only raise a blocking question when a credential, account entitlement, Apple signing identity or other truly external action is required. Never invent credentials, external data, biometric measurements, assessment accuracy, live video URLs, developer account ownership or PGA endorsement.

Keep a living implementation checklist, clear commit-sized milestones, and an honest end-of-run report with completed features, unimplemented features, tests executed and next actions. No hidden paywalls, paid APIs, subscriptions, external analytics, unsolicited network activity or source-content scraping.

---

## 1. DEFINITIVE PRODUCT DECISIONS

1. **Platform:** iPhone only, native Swift/SwiftUI. Do not produce a cross-platform React Native/Flutter app or a PWA as the primary output. Optimize for portrait, with landscape video review. Accessible Dynamic Type, VoiceOver descriptions, dark mode, and one-handed use.
2. **Analysis:** First ship **imported video analysis**, then enable live camera swing analysis in a later independently validated phase. 'Video analyser' must perform real on-device video decoding, human-pose inference and computed measurements where supported, not merely send a frame to a text model asking for golf advice.
3. **Scope of eventual coaching:** driver, woods, hybrids, long/mid/short irons, wedges, putting, chipping, pitching, bunker basics, setup, alignment, grip, ball-flight concepts, practice strategy, course management, mental/routine skills, club gapping and score analysis. Deliver incrementally.
4. **Cost:** Use native free/local technologies by default. Optional paid integrations must be off by default and described with costs before addition. No remote general-purpose LLM required to operate core functionality.
5. **Lessons:** Curated, human-verified, authoritative public coaching sources, including Me and My Golf and PGA-qualified coaching. Store permitted metadata, short ORIGINAL summaries and source links; do not copy paid course videos or pretend to own rights to content. A lesson must still be usable when its external link breaks (show the original locally authored drill description and explain link is unavailable).
6. **Privacy:** Private data for each golfer. Local-first, useful without internet, with optional private iCloud/CloudKit sync and backup across the owner's Apple devices where supported. Treat videos as sensitive personal media. Sync text metadata and video assets as separate, robust flows. Do not assume SwiftData automatically syncs arbitrary external movie files.
7. **Personalisation:** A real, skippable, multi-step first-run assessment creates a new user's profile **from their own answers**, never from a seeded person's golf history. Defaults must be blank/unknown, not the developer's clubs, ability, handedness, name or miss pattern. The first version supports one active private profile on a device, but data records must be owner-scoped for eventual public rollout. The onboarding and My Bag flow are MVP requirements, not future ideas.
8. **Locale:** British English as initial UI language, but respect the phone's locale, time zone, 12/24-hour setting and date conventions. Let the golfer choose yards/metres and feet/inches or centimetres. No hard-coded Europe/London, sex, country, or GBP assumption. All sessions use correct user-local dates with UTC persistence.

---

## 2. USER-FIRST ONBOARDING + COMPLETE CLUB CATALOGUE + BUILD MY BAG (MUST SHIP)

**Absolute rule:** Do not hard-code the original requester's name, body measurements, handicap, golf clubs, distances, scoring, practice equipment, mobility details, previous lessons, swing faults, PGA professional or local courses. The product must work correctly when a totally different first-time golfer installs it. No hidden personalised sample data. Test fixtures must be fictional and clearly segregated from production data. Onboarding should take roughly 3–5 minutes if the user answers basic questions, but **Skip for now** and later editing must work without punitive nagging.

### 2.1 First-run onboarding screens (each has Back, Save & Continue, and where safe Skip)

1. **Welcome & privacy:** State that videos are processed on the device, initial records are local, iCloud backup is optional and requires configuration, coaching is not a substitute for a PGA professional, and no measurements will be invented. Offer 'Get started' or 'Explore with empty profile'.
2. **About your golf:** Preferred display name (optional text), dominant playing hand `right / left / prefer not to say / not sure` (don't default to right), self-selected ability `brand new / beginner / improving / intermediate / advanced / prefer not to say`, years played (optional), self-reported handicap (optional, must distinguish official vs estimated), usual rounds `9 / 18 / both / rarely play`, usual practice types, typical practice minutes. No age, gender or medical history required; optional age *range* only if it serves a demonstrated coaching purpose and with privacy explanation.
3. **Comfort & body fit (optional):** Height with units, wrist-to-floor measurement with explicit instructions and units, comfort/range-of-motion/practice-volume preferences, cart/trolley/walk preference, accessibility needs. Use only for optional coaching accommodation and professional-fitting questions; do **not** calculate a 'required shaft length or lie' or make medical assessments from body numbers. Support 'I don't know'. Do not store diagnostic health histories.
4. **Playing tendencies:** Multi-select known challenges (slice right, hook left, push, pull, tops, fats, thin shots, unpredictable strike, distance control, bunker confidence, chipping contact, putt start line, putt pace, green reading, penalty avoidance, club gapping, unsure, other free text). Present neutral ball-flight labels and ask right-/left-handed context; never assume that all users slice. Allow desired goals with ordered priority and measurable definition (e.g., keep 12/20 tee shots playable; avoid frequent three-putts).
5. **Practice situation:** How frequently they can play, indoor straight-line floor space if relevant, optional aids (alignment sticks, putting mat, mirror, launch monitor, net, tripod), grass/mat practice access, coaching/pro details (name optional, private), upcoming events optional. Default to 'not supplied'; do not require pro or any equipment.
6. **Club selector and bag builder:** Mandatory access to the complete flexible club catalogue defined below. Starting inventory and active bag are **empty** until the golfer selects clubs. Let users skip and add clubs later; show clear empty-state CTAs, not the original requester's inventory.
7. **Optional baseline import:** Past round(s), scores, per-hole putts, any measured/estimated club carry or total distances, recent range outcomes, swing videos and existing lesson focus may be entered now or later. **Nothing is filled in automatically.** Dates, source type and units required only if entering a corresponding measurement.
8. **Review & personalised starter plan:** Show exactly what the user entered, flag genuinely missing information, let them edit, then offer a 10–15-minute level-appropriate diagnostic practice session. When baseline is missing, recommend basic, safe exploratory drills rather than claiming a specific fault. An experienced golfer can demonstrate competencies and skip novice courses through honest assessments.

For every field distinguish `not_assessed`, `not_provided`, `self_reported`, `coach_confirmed`, `device_measured` and `imported`. Persist time and units. Never quietly fill blanks from the device, an AI guess or a sample user's history. Preferences and profile data are fully editable in **My Game -> Player Profile** at any time; changes must not silently change historical assessments.

### 2.2 Club catalogue — show every type as a selectable club-face tile

Build a dedicated **My Clubs -> Club Catalogue -> Build My Bag** wizard as a central first-run feature, not a plain unstructured text list. Show an organised, searchable grid of **every mainstream club category and numbered option**, plus custom club entry. Every option is a separate **visible tile/card with original, generic stylised club-face or clubhead artwork**, a readable club name, and an Add button/checkbox. This is an illustrative shape, not a falsely precise image of a branded club. Do not use manufacturers' copyrighted images, logos or trademarks as artwork unless properly licensed. Group tiles into expandable categories:

- **Drivers / tee woods:** Driver, mini-driver, legacy 1-wood. Let multiple driver instances exist, e.g. two different driver models.
- **Fairway woods:** 2-, 3-, 4-, 5-, 6-, 7-, 8-, 9-, 10- and 11-wood, plus an 'other-number/custom wood'. Do not assign fixed lofts; these categories overlap in actual marketed naming and specifications.
- **Hybrids / rescue clubs:** 1- through 9-hybrid, plus custom hybrid/utility hybrid. A driving iron is **not** a hybrid: keep separate categories.
- **Driving / utility irons:** 1- through 9-utility/driving iron plus custom; allow brand/model and optional shaft/loft to distinguish them.
- **Traditional irons:** 1- through 9-iron, with each visible as an individually selectable face/tile. A user might have 5, 7, 8 and 9 without a 6; never auto-add a complete set.
- **Wedges:** Pitching wedge (PW), gap/approach wedge (GW/AW/UW), sand wedge (SW/SI), lob wedge (LW), higher-loft wedge and **wedge-by-loft** custom entries (e.g. 46°, 48°, 50°, 52°, 54°, 56°, 58°, 60°, 62°, 64°; user can enter any valid loft with appropriate bounds). 'W', 'P', 'A' and other stamped aliases should map to friendly labels without assuming actual degrees. Allow two wedges with the same category and different lofts/brands.
- **Specialist / short-game:** Chipper, chipper-putter, specialty recovery/other compliant or nonstandard club. Mark unusual types as user-defined rather than making claims about competition legality.
- **Putters:** Putter (blade, mallet, other/unknown optional subtype); allow more than one owned putter but only chosen putter(s) in the current bag.
- **Custom / other:** Free-text type and display name, category, optional loft and description; supports uncommon and future club types without requiring an app update.

**Do not conflate category numbers with lofts or iron/hybrid distance; do not label a 16° driving iron as a 'hybrid' automatically.** Include no opinionated default brands, sets or prices. Catalogue definitions (stable codes, labels, categories, artwork) are **generic reference data**, not owned clubs. All artwork is original or safely licensed.

### 2.3 Per-club detail form — brand text box on EVERY selected club

Tapping each face/tile opens a concise form and optional expandable advanced specs. Required or requested UI:

- **Brand / manufacturer — free-text editable field visibly labelled 'Brand' for each and every individual club instance**, not one brand for an entire set. Examples in placeholder only: 'Enter brand'. Never pre-fill from the developer's bag. Permit 'Unknown' and blanks rather than blocking a golfer who does not know the brand.
- **Model / series — separate free-text field** (e.g., product model or range); optional. Autocomplete later only if powered by a maintained, licenced catalogue, and always allow arbitrary custom text.
- Club type/number selected from the complete catalogue; **editable optional loft** with degrees and 'not known'; don't guess from a brand/model name. Optionally club length (in/cm), lie (°), shaft brand/model, flex, shaft material, grip, condition, purchase year, custom notes, and a photo uploaded by the golfer (no commercial imagery needed).
- Per-club **distance records**: optional estimated carry, estimated total, measured carry, measured total, dates, source (user estimate/range device/course), range vs course and sample count. Distinguish every category and prevent impossible unit conversions/data entry where clear; never assume driver 200 yards or any other default.
- **Handedness** at golfer level with per-club override for unusual cases. Retain club identity as `ClubInstanceID` (UUID) distinct from generic `ClubTypeID` so two 7-irons of different brands are represented separately and history remains linked correctly.
- Actions: **Save to My Clubs**, **Add to My Bag**, Save but Leave Out, Edit, Duplicate, Remove from Bag, and Delete Club (with clear history-safe handling). On detail changes preserve past logs by club instance ID.
- A fast **'Add iron set'** helper may bulk-create chosen iron numbers, but still produce a separate club instance for each, with **editable Brand text box for each club**; users can replace individual irons from a mixed-brand set. Never silently add missing irons.

### 2.4 Select clubs to build the current bag

Maintain two separate concepts:

**My Clubs / Owned Clubs** — every club the golfer has added, including spare clubs, clubs in storage and demo/borrowed entries. **My Bag / Active Bag** — the subset selected to take onto the course or practise today. A golfer may own 20 clubs but select only 14 for a typical rules-compliant competitive round.

- Show each owned club as a card with its type, optional brand/model, visually recognisable generic clubface, known loft, optional gapping figure and an **in-bag toggle / checkbox**. Include list and grouped visual grid. Clearly show **'X / 14 in bag'** with a progress indicator, plus quick `Add`, `Remove`, `Swap`, `Clear Bag`, `Save Setup`. Separate competition (14 max) from casual practice (allow larger practice selection but label 'practice selection — not an on-course 14-club bag'). If a golfer tries a 15th club in competition bag, do not silently add it: explain and offer swap/remove. Rule applicability should be checked against current official rules before publication; users may record historical/nonstandard situations without destroying evidence.
- Do not force 14 clubs; 1–14 is valid. A zero-club bag has an explicit 'Add your first club' empty state. **Never auto-check a driver, putter, or any club.** Allow duplicate category types (e.g., two different 7-irons) as separate entries, subject to bag limit.
- Let user create **named bag presets** (e.g., Everyday, Par-3, Practice) and switch without losing underlying club inventory; preserve preset history when club details change. Each upcoming/practised round may snapshot which club instances were in the bag at the time, so later bag changes do not rewrite history. A removed/deleted club must not erase past shots, videos, rounds or distances; use archival/soft deletion if referenced.
- Video import, lesson filtering, practice plans and round club picking must **default to active-bag clubs**, with explicit `Choose another owned club` and `Unknown / not entered` options. If user has no bag, do not crash or force guessing. Filter advice according to current available clubs — no 5-wood practice plan for someone who has never added a 5-wood.
- Club gapping comparison uses source-labelled actual per-club data; indicate unknown carry/total, overlapping distances and insufficient samples without filling holes artificially. No purchase advice or fitted length predictions based on height alone.

### 2.5 Implementation models, screens and validation

Implement separable persistent models rather than one giant JSON dictionary: `PlayerProfile`, `OnboardingProgress`, `PlayerGoals`, `ClubTypeDefinition` (versioned generic reference data), `ClubInstance`, `ClubDistanceObservation`, `ClubBagPreset`, `ClubBagMembership`, `EquipmentPhoto` (local reference), `PlayerSkillBaseline`, `GolfCoachNote`. Relationships and historical references must survive SwiftData migrations; CloudKit-compatible identifiers avoid relying on unsupported uniqueness constraints. Club type definitions are editable through a versioned reference catalogue; **display name is never used as primary key**.

Required screens: `Welcome`, `Experience`, `Comfort (optional)`, `My Goals`, `Practice Environment`, **`Club Face Gallery`**, **`Add/Edit Club`**, **`My Clubs`**, **`Build My Bag`**, `Baseline (optional)`, `Review`, and editable `My Game` sections. Make step progress visible, use large tappable tiles and accessible labels ('Add 7-iron', 'Brand for selected 7-iron', 'Remove from bag'), support search and scrolling for large catalogues, and persist partially completed onboarding between relaunches.

Data validation: empty/unknown optional field is supported; category type is a stable code; loft numeric bounds and units verified; user-created custom clubs handled; partial/duplicate clubs allowed intentionally; no phantom equipment enters state; no unwarranted device access; 14-club cap applied only to active competition bag, never global inventory. Existing club forms remain editable after onboarding. **The first successful onboarding test must be run with a fictional golfer whose clubs, handedness, skill priorities and scores differ completely from the original requester.**

---

## 3. PRODUCT NAVIGATION AND USER EXPERIENCE

Create a polished but restrained iOS golf-coaching UI with these major destinations (organise into five main tabs if that is more iPhone-friendly):

- **Today:** personalised main focus **derived from this user's own onboarding and evidence**, reason for recommendation, one 15–30-minute drill, next challenge, reminders of proven strengths and optional refresher flags. If there is not enough baseline information, use an initial diagnostic session instead of inferring a flaw.
- **Analyse:** Photos/video import, technique guidance for camera setup, select club and camera angle, check quality, local processing progress, video player with timeline and frame-by-frame controls, pose overlay, measurements/evidence, side-by-side comparison with matching-angle clips, save analysis and send findings into skills. 'Unknown / insufficient evidence' must be a prominent possible result.
- **Learn & Train:** structured coaching paths, verified source lessons, original drill instructions, prerequisites, milestones, practice sessions, self-checks, evidence submissions, skill badges and explicit assessment criteria. 'Completed a lesson' is NOT 'mastered a skill'.
- **Rounds & Practice:** range-shot sessions, practice outcomes and drills; fast 9/18-hole scorecards, hole-by-hole putts and misses, recoveries, penalties, missed shots, club selection and optional free-text or voice-note memory. Do not force detailed shot-by-shot input during play.
- **Progress & My Game:** profile/onboarding edits, **My Clubs / Build My Bag**, score trend, scoring distribution, putts (only when recorded), three-putts, fairways with denominator, shot-dispersion logs, source-qualified club carry/total gapping, skills map, mastery and refresher history, confidence of findings, dates of last valid evidence, coach notes, settings/export/privacy.

Use plain-English explanations, not fake 'tour precision'. **Hypothetical example only (display only after user data actually supports it):** 'You logged 8 of 12 driver shots as starting on line then curving right. Face-to-path could be a factor, but this video does not measure face or path at impact. Review ball-flight basics and ask your coach to investigate.'

Provide Home, Range, Course, Putting Green and Indoor practice contexts. Support one-tap start/repeat of a previously completed session and quick input of successes / attempts / shot shape.

---

## 4. SWING ANALYSIS — NON-NEGOTIABLE SCIENTIFIC AND ENGINEERING REQUIREMENTS

### 4.1 Camera pipeline

- Import user-selected videos through SwiftUI `PhotosPicker` / PhotosUI (`.videos`) and support Files import if practical. Handle HEVC, H.264, portrait, landscape, high FPS, slow-motion and variable timestamps robustly. Do not request broad photo-library access when a system picker suffices.
- Preserve original video and orientation where practical; use an app-private, file-coordinated local video library. Store stable relative file references and content hashes. Generate separate analysis proxies and thumbnails. Provide delete, duplicate detection, disk-space warning, cancellation and retry.
- Extract frames/timing using AVFoundation (`AVAssetReader` for reproducible chronological sequences; `AVAssetImageGenerator` where suitable for thumbnails and frame review). Correctly handle preferred transforms, pixel aspect and crop mapping; preserve source timestamps, not fabricated FPS. Use a performance-aware sampling strategy (coarse phase pass, detailed windows) rather than running every frame of a long 4K/240-fps video. Record actual frame timestamps.
- Use **Apple Vision 2D pose** on-device as the baseline. Apple Vision 2D detects up to 19 human body points; available 3D estimation on supported versions detects 17 joint locations but is an **estimated single-view pose**, not ground-truth motion capture. Wrap in a `PoseEstimator` protocol so MediaPipe's iOS Pose Landmarker (33 landmarks) can be evaluated later without redesign. Keep framework-specific joint names mapped explicitly to internal semantics. No pretrained model download may be assumed to happen magically.
- Must work with no network, no API keys and no paid services. Use background tasks/Swift concurrency carefully, avoid memory spikes, allow cancel and resume, render visible progress, and cache analysis only where algorithm version and input hash still match.

### 4.2 Capture guide and quality gate

Require selected club instance from **My Bag** (or another owned/custom/unknown club), intended shot type, **user-provided playing hand (right or left, if known)**, **down-the-line (DTL)** or **face-on (FO)** view, source footage details and optional notes. Illustrate the two angles with original diagrams. DTL = behind the golfer looking down the intended target line; FO = perpendicular to target line facing the golfer. Recommend roughly hand/elbow height, stationary support, full body and entire club visible, uncluttered background, good lighting, 120 fps or higher *when convenient* (ordinary 60 fps should still be allowed with lower temporal precision). Never use commercial 3D capture hardware specifications as a promise of comparable accuracy on a single phone.

Check approximate athlete visibility, continuity and subject identity (avoid multiple golfers), limb/club occlusion, frame rate/timestamps, stability, framing and pose-joint confidence. Warn about DTL/FO mislabelling and allow manual correction. No 'confident' assessment from an unusable clip. Keep quality scores descriptive rather than presenting model-detection confidence as calibrated probability of a golf diagnosis.

### 4.3 Phases and overlays

Display a scrubbable video with joint skeleton, trails and phase annotations: address, takeaway, halfway back, top of backswing, transition, downswing, impact *approximate only unless visually confirmed*, post-impact and finish. Auto phase segmentation only when the video supports it. Include **manual annotation/correction** for P1–P10-like positions without falsely adopting proprietary labels. Smooth jitter without smoothing away genuine motion; indicate joints that disappeared/reappeared.

Side-by-side comparisons only between comparable angle, handedness, club/type and camera setup, or provide a strong mismatch notice. Comparison should align event positions/time normalisation with confidence and show raw video as well as skeleton overlay. Do not imply every difference from a pro's swing is a fault. The golfer's own best repeatable swing and their coach-approved reference are preferable to an anonymous tour swing.

### 4.4 Analysis capability tiers

**Tier A — candidate measurable from pose with appropriate view and adequate confidence:** projected head-centre displacement relative to baseline; lead/trail knee or hip projection, torso/shoulder-line inclination and changes, address posture change, projected pelvis translation, approximate elbow/wrist height and spacing, body position at manually identified phases, stability/consistency of repeated body movement and tempo *only when phase timing is defensible*. Always identify camera angle and whether a result is a 2D image-plane projection or estimated 3D quantity. Scale image-plane displacements to body-relative units when appropriate and disclose limitations.

**Tier B — potentially assessable only with custom validated club/ball tracking and camera calibration:** true club shaft orientation, clubhead trail, attack angle, impact moment, precise release timing, body-club relationship. **Do not label as measured until actually implemented and validated**, especially through high-speed motion blur. For pose-only app, this stays 'Not measured'.

**Tier C — NEVER claim as measured from basic human-pose video:** clubface angle at ball contact, true club path, face-to-path, spin axis, ball speed, clubhead speed, carry yardage, smash factor, spin rate, lie angle at impact, strike location, exact pressure shift and ground-reaction forces. These require suitable independently verified equipment/data or a separately validated visual system with uncertainty. If launch-monitor data is later imported, display it with `source: imported device`, units, timestamp and device/model; never quietly relabel it as camera-derived.

**Ball flight:** A golfer might record 'starts straight then curves right'. This is **observed/self-reported** ball flight, not a camera-measured clubface. Present face/path explanations as potential mechanisms rather than diagnosis. Clubface largely influences launch direction and face-to-path influences curvature, with contact and gear-effect caveats; cite TrackMan in the explanation.

### 4.5 Analysis output schema and explainability

Each finding MUST contain: finding identifier, recording reference, shot club, view and physical camera conditions, user-visible label, category, evidence source (`pose_measured`, `estimated`, `manual_observation`, `launch_monitor_import`, `coach_note`), algorithm and model version, frame interval, relevant joint visibility, numeric metric plus units **if valid**, reference to previous comparable attempts, limitations, qualitative confidence rationale, suggested next investigation, relevant curriculum skill IDs, and `needs_manual_confirmation` flag. Reserve statuses `valid`, `tentative`, `insufficient_evidence`, `unsupported`, `rejected_by_coach`.

Examples of acceptable findings: 'From this face-on video, your head moves about 8% of your shoulder width toward the target between marked address and top; the frame has sufficient visibility. This alone does not establish a swing fault.' An unacceptable finding: 'You have a 6° out-to-in path and 4° open clubface' based only on Vision body landmarks.

User can disagree, dismiss, mark as corrected by their coach, or request a fresh sample. Explanations should make the app **less certain** when camera angle, sample size, occlusion, joint jitter or comparison mismatch is poor.

### 4.6 Validity tests

Create unit tests for coordinate orientation, mirrored videos, joint missingness, timestamp interpolation, smoothing, phase transitions and camera-view restrictions. Create a reproducible video-pipeline integration test using only owned/licensed test clips (if not available, deterministic synthetic motion frames for software mechanics, clearly **not validation** of swing diagnostics). Establish human review of at least a small, consented and manually annotated collection before releasing any automatic biomechanical fault detection. Report false alarms, no-detection frequency, disagreement across views and test size. Until such validation exists, automatic labels must say 'movement observation', not 'confirmed fault'.

---

## 5. THE SKILLS ENGINE — A PROGRESSIVE COACH, NOT JUST A CHECKLIST

Construct a data-driven directed acyclic graph of skills with stable IDs, domain/category, prerequisites, instructional sources, preferred practice context, current competency state, measurable criteria, evidence types and versions. Domain taxonomy should include:

1. Setup/fundamentals: grip awareness, posture within comfort, alignment, ball position, consistent routine.
2. Driver: start-line awareness, curvature observation, playable shot pattern, strike quality, tee routine, directional control, on-course transfer.
3. Woods/hybrids: ball position, clean turf contact, predictable start line, usable trajectory, fairway/tee adaptability.
4. Irons: centre contact, low-point awareness, carry calibration, predictable dispersion, distance control, course transfer.
5. Wedges: partial swings, landing zones, trajectory choices, consistent carry, bunker introduction.
6. Short game: chip contact, bump-and-run with **a club that is actually in the user's bag** (e.g. an iron), wedge chip/pitch, landing point, club selection, up-and-down strategy.
7. Putting: start line, 3–5 ft conversion, 10–30 ft pace, lag zones, green-read routine, avoiding three-putts.
8. On-course decisions: safe target selection appropriate to **the individual player's observed predominant miss** (slice, hook, push, pull, or no known pattern), avoiding penalty shots, club choice based on conservative carry, recovery rules, pre-shot routine, playing calmly at one's own pace.

A top-level course is complete only when the user finishes its assigned learning and drill content. A skill is **not mastered** just because a lesson/video was watched, a single swing looks pleasing, or the player answered a quiz correctly.

### 5.1 Distinct state machine

Implement persisted, event-sourced or auditable states, preserving history:

`locked -> available -> learning -> practising -> assessment_ready -> proficient -> mastered`

Parallel non-destructive flags: `needs_reassessment`, `refresher_recommended`, `coach_locked`, `paused`. Keep a separate `contentCompletedAt` and `masteredAt`; do not downgrade historical mastery when a player temporarily regresses. Permit coach override with author, rationale and date; manual user override must not be misrepresented as verified passing evidence. Changes to the algorithm/criteria version must preserve the historical criteria and provide a pathway to revalidation.

A 'fully trained' or '**Mastered**' card means mastery of **that precisely defined skill and context at its current level**, never that the entire complex area (e.g. driving) is finished forever. Later advanced levels become available. Expert golfers should not be forced to repeat beginner instruction unless there is an evidenced reason.

### 5.2 Evidence-backed gates

Each criterion must specify: skill, level, assessment type, denominator/attempt count, numerator/success definition, recording method, sessions required, spacing between sessions, ball-flight/playing conditions, optional video-quality threshold, allowable coach confirmation, and reset logic. Use configurable **initial app-defined training benchmarks**, not claims that one percentage is a universal PGA certification standard.

Default graduation principle: meet target on **at least three valid, separately dated practice sessions across approximately 14 days** plus at least one appropriate transfer test when relevant (e.g. on course or different practice environment). Allow a professional to approve an alternative. Do not infer on-course scoring causation from one round. No evidence = no automatic pass.

Examples (optional, configurable introductory training hypotheses to calibrate using **the actual golfer's baseline and a qualified coach if available**; do not treat numbers as universal standards):
- **Driver A1:** record 20 shots per assessment in a defined practice setting; outcome manually logged as playable / slice too far right / push / pull / topped / other. Level 1 might be 12+/20 playable on each of three sessions, with an eventual 14+/20 higher-level target and transfer test. Adapt to established baseline, never retroactively claim success. Video quality is not a substitute for logged playable outcomes.
- **Putting P1:** 10 putts from 3–5 ft, 7+/10 on three assessment days as an *initial training challenge*, adjusting for conditions. Separate indoor straight-mat success from breaking outdoor greens.
- **Putting P2:** 10 lag putts from a documented distance, score those finishing within a clearly specified 3 ft radius; initial target 8/10 in controlled practice, with later outdoor transfer; also track on-course 3-putts per hole where putts were actually recorded.
- **Hybrid H1:** define a clear 'usable contact / playable flight' outcome, track 10–20 attempts off mat versus grass and tee separately, with a deliberate on-course check. Never treat 14/16 mat contact as mastery in real turf.
- **Iron I1:** for an iron the user has added to My Clubs, collect an adequate set of measured carry observations (if available) and outcome windows; separate solid contact from distance estimation. If a player demonstrates reliable contact, prioritise measured gapping rather than imposing needless beginner contact remediation.
- **Short game C1:** record landing-zone outcomes for the actual bump-and-run iron/chipper and chosen wedge in their bag, separately; never assume the golfer owns a 9-iron, sand wedge or chipper.

### 5.3 Automatic regression and refresher logic

After mastery, establish an approved personal baseline for that skill, club, view, context and measurement version. Schedule *occasional reassessment* where meaningful, not intrusive daily checks. Compare only like-for-like evidence, with enough sample size and confidence. Use rolling windows, practical minimum attempts, hysteresis, and thresholds explicitly versioned and documented. Detect potential drift from **repeated deterioration**, not a single poor shot, cloudy video or rainy round.

Proposed state transitions:
- One low-confidence measurement -> `insufficient_evidence`; request better footage; NO refresher.
- One reliable but anomalous measurement -> `monitoring`; never erase mastery.
- Two or more materially worse comparable assessments across distinct sessions **plus** negative outcomes or a coach confirmation, with sufficient sample size -> `refresher_recommended` with cited evidence and a short targeted programme.
- Successful refresher assessment -> clear flag, append an event, retain original mastery timestamp and evidence.
- Coach explicitly accepts a deliberate technique change -> version new baseline; don't nag about 'regression' toward an outdated motion pattern.

Prevent metric-gaming: if an athlete shortens their swing and gets a smaller head-movement number, do not automatically call that an improvement if the ball-flight or strike outcome worsens. Avoid comparing indoor mat practice to windy course results as equivalent. Make false-positive flag rate inspectable and allow dismiss/snooze.

### 5.4 Adaptive training planner

Generate realistic 15/30/45/60-minute sessions from `weakest evidenced skill + **ClubInstanceIDs in selected My Bag** + self-reported practice gear + available space + coach priorities + comfortable practice load + next upcoming round`. **If the bag is empty, generate a no-club optional fundamentals/putting diagnostic or ask for clubs, not a fictional driver session.** Balance practice rather than overtraining one fault. Provide clear warm-up, 1 main focus, 1 drill, target, how to log and next decision. Display who/what motivated each plan. After outcomes are entered, update recommendations deterministically; optional natural-language summarisation only if it can be generated privately and clearly distinguished from measurements.

---

## 6. VERIFIED LESSON AND VIDEO LIBRARY

Create an extensible catalog but seed only **verified** resources and original drill cards. A curated resource must have: source name, coach/author where present, publication/update date if known, topic, target player level, video/article type, canonical URL, public/free-or-paid visibility, `linkVerifiedAt`, rights category, summary written by this app, prerequisites, equipment, study time, evidence it is appropriate and skill links. Do not hallucinate YouTube IDs or invent direct video URLs. Paid resources can be linked but must be visibly labelled 'external purchase/subscription may be required'; never scrape or redistribute them.

**Starting credible URL register for validation (re-check each URL at implementation time):**

- Me and My Golf official, slice plan: https://meandmygolf.com/fix-your-slice/ — offers a multi-step slice curriculum. Treat the programme itself as proprietary, **do not reproduce its five steps as your own** without rights. Write an independent educational pathway and link to their original page.
- PGA of America, slice mechanics/drill: https://www.pga.com/story/golf-tips-try-this-drill-to-cure-your-slice
- PGA of America, alignment-stick slice drill: https://www.pga.com/story/how-to-fix-your-slice-with-an-alignment-stick
- PGA of America, driving start-line / chipping / putting drills: https://www.pga.com/story/3-fun-drills-to-dial-in-your-driving-chipping-and-putting
- PGA of America, putting gate, 3-foot circle, distance control: https://www.pga.com/story/golf-tips-the-best-putting-drills-to-improve-your-stroke
- PGA of America, other simple drills: https://www.pga.com/story/5-simple-drills-every-golfer-should-know-and-use
- PGA of America, low-point and contact: https://www.pga.com/story/pga-coach-shares-4-easy-golf-drills-to-improve-your-swing
- PGA of America, indoor practice planning: https://www.pga.com/story/how-to-practice-golf-at-home-series-part-1
- TrackMan, physics: https://www.trackman.com/blog/face-to-path and https://www.trackman.com/blog/what-is-face-angle — use for **explaining** launch/curvature physics, not pretending to measure them.
- TrackMan's professional two-camera 3D requirements: https://support.trackmangolf.com/hc/en-us/articles/48192966090779-3DMA-Camera-Setup-for-Successful-3D-Motion-Analysis — reference for capture quality principles, **not** evidence a single-phone system meets 3DMA accuracy.
- The R&A official rules: https://www.randa.org/ — link to current authoritative rules and avoid embedding rules that may change.

When internet access is available for development, proactively find and verify additional reputable resources from qualified PGA coaches, England Golf, The R&A, USGA (where relevant), TrackMan educational pages and free public Me and My Golf pages. Rank on source authority, relevance to each user's reported or measured needs, clarity, pedagogical soundness, publication/maintenance and instructional disagreement. Make a `SOURCE_REGISTER.md` with URLs and dates reviewed; if you cannot browse, ship the known links as `verification_pending` rather than fabricate confirmation. Provide no false claim of exhaustively reviewing 'all videos on the WWW'. Curate deliberately and disclose incomplete coverage.

Use source links opening in Safari or an approved compliant embed. Obey video platform terms: no automated downloading, extracting audio, copying captions or circumvention of paywalls. Include `report broken link` functionality and manual editorial review. Never advertise the app as affiliated with or endorsed by Me and My Golf, the PGA, TrackMan or Apple. Use an original name, icons and layouts rather than copying their protected branding or interface.

Seed **original** instructional drill cards, properly attributed where inspired by public descriptions (not verbatim republishing):
- Optional putting-mirror alignment self-check **only if the golfer owns one**; controlled straight putts at 3–5 ft; ladder pace control adapted to the user's available floor/green space; outdoor 3-foot circle; gate start-line; 10–20 ft lag speed test; mats are flat and don't teach slope reading.
- Driver (or suitable longest bag club) ball-start/curve log with a marked intermediate target, alignment stick only if owned; safe clubface/path education rather than guesswork; half-swing/slow-swing optional test only if comfortable and appropriate.
- Selected hybrid/wood tee vs grass strike log **when a user owns these clubs**; iron carry notebook with evidence categories; available bump-and-run club vs wedge chip comparison. Omit drills that require unavailable equipment.
- Before/after on-course transfer, pre-shot routine and safe recovery/target selection.

Each drill should include: setup, tools, context, time, attempt count, pass definition, common recording mistakes, safety, linked videos, linked skills, how to adapt for solo play and how to assess transfer. A user must be able to explicitly mark an external video **unwatched**; never auto-mark learning complete just because a link was opened.

---

## 7. COURSE AND PRACTICE RECORDS / VALID ANALYTICS

Round data model: course ID + tee + holes/par (editable), date/time local and UTC, total strokes, per-hole score/par, putts nullable, optional FIR when eligible, GIR when objectively logged, penalty strokes, tee club/shot result, predominant miss, notes and any source provenance. Support **9 holes as first-class**, not an 'incomplete 18'. No automatic official handicap index computed from casual nine-hole rounds; if implementing WHS in future, review current R&A/England Golf rules and distinguish unofficial trends from authorised handicap calculations.

For missing data use null/unknown, never 0. Denominators must show '5/6 recorded' rather than 83% of arbitrary unknown holes. If a scorecard edit conflicts with old entries, maintain version/edit history. User controls whether a round is displayed as private practice or score history.

Show trends with sample sizes and noncausal descriptions (e.g. a 2-shot difference between two comparable rounds is insufficient evidence of durable score improvement). Include personal-best labels only when source/tee comparability is satisfied. Club charts should distinguish estimated total vs measured carry; current values may be user estimates. Support CSV/JSON export, import and backup verification with no proprietary lock-in. Export optional short coach summary and selected annotated screenshots/videos only with owner consent.

---

## 8. TECHNICAL ARCHITECTURE AND PERSISTENCE

**Preferred stack:** Swift 6 (or stable version supported by target Xcode), SwiftUI, SwiftData where suitable, AVFoundation/AVKit, PhotosUI, Apple Vision, CoreGraphics/Accelerate, Swift Charts and XCTest/Swift Testing. Choose a realistic minimum deployment target (suggest iOS 18+, verify available APIs). Use Apple first-party frameworks unless a dependency demonstrably solves a problem and its licence/security maintenance has been reviewed. Avoid non-native backends for MVP.

Layered, testable packages/modules or folders:

```
AdaptiveGolfCoach/
  App/                     // app entry, DI, navigation, configuration
  Domain/                  // pure business models/rules, skill state machine
  Data/                    // SwiftData adapters, video files, repositories
  VisionPipeline/          // import, decoding, pose, quality, phases, metrics
  Features/
    Today/
    Analyse/
    Academy/
    Practice/
    Rounds/
    Progress/
    MyGame/
    Onboarding/
    MyClubs/                // complete catalogue, brand/model forms, bag builder
  Services/                // curriculum, trend engine, cloud adapter, exports
  Resources/               // source-verified lesson manifest, bundled artwork
  Tests/                   // domain, data, vision, integration and UI tests
  Docs/
    ARCHITECTURE.md
    BUILD_AND_RUN.md
    SOURCE_REGISTER.md
    MEASUREMENT_VALIDITY.md
    COMPETENCY_RULES.md
    DATA_DICTIONARY.md
    PRIVACY_SECURITY.md
    RELEASE_CHECKLIST.md
  AGENTS.md                // concise coding rules for future Codex sessions
  IMPLEMENTATION_STATUS.md
```

Use protocols/interfaces for `VideoRepository`, `PoseEstimator`, `AnalysisPipeline`, `SkillAssessmentEngine`, `CurriculumRepository`, `PracticePlanGenerator`, `RoundRepository`, **`ClubCatalogRepository`, `ClubInventoryRepository`, `BagPresetRepository`, `OnboardingRepository`**, `SyncProvider`, `CoachFeedbackRepository`. Make business rules pure and directly unit-testable. Avoid massive view models, `try!` and fatal traps on recoverable storage/cloud errors. Build schema migrations and retain versioned analysis metadata.

**Persistence:** Store structured user profile/onboarding choices, generic club-type catalogue, owned **club instances with brand/model free-text**, bag membership and presets, per-club distance observations, skills, lessons, drills, recordings metadata, joint observations or derived measurements, assessment attempts, proof bundles, coaching overrides, practices, rounds, permissions and sync status. Prefer store only necessary per-frame landmarks and make expensive raw landmark retention user-controllable. Keep originals local in an app-managed directory and a manifest in the data store; use file protection/encryption available on iOS. Sensitive diagnostic/mobility input is opt-in and not included in logs/telemetry.

**iCloud:** For the first working MVP, local persistence MUST work without iCloud or Apple Developer membership. Provide a `SyncProvider` with explicit `local_only`, `icloud_not_configured`, `syncing`, `synced`, `sync_failed`, `conflict` states. SwiftData + CloudKit may sync compatible metadata when iCloud and background notification entitlements are configured; check restrictions including unique attributes, relationships and production schema evolution. Videos must be separately managed as optional private CloudKit assets (`CKAsset`) or another Apple-supported asset storage approach, with quota checks, selective backup (Wi-Fi only option), chunk/size handling as required by documented limits, retries, deduplication, conflict resolution, progressive restore, deletions and explicit status. **Do not call a local video 'backed up' until confirmed remote.** Protect CloudKit record visibility with the private database, authenticated Apple account and appropriate permissions. Treat iCloud sync as a user-authorised optional capability, not as a substitute for a tested restore plan.

**Account:** 'Private account' can mean **each installing golfer's own Apple ID/private iCloud database**; no email-password server is needed now. It must never use the developer's Apple account for all users. In current release keep per-user data isolated on-device and within that golfer's private CloudKit scope where configured. If a future multi-account or non-Apple-ID product is built, define consent, secure sign-in and a migration path to isolated per-user data instead of silently merging accounts.

**Security:** No user video uploads to third parties by default; no hard-coded secrets, API tokens or credentials. Permissions must be purpose-specific; use iOS Photos picker for chosen files. Provide Delete All My Data, remove-video and export-data controls. Research UK GDPR and App Store privacy declarations before any future public launch, but do not claim legal compliance without review. No unauthorised collection of third-party golfers' videos.

---

## 9. CAMERA ANALYSER FEATURE DETAIL / UI ACCEPTANCE CRITERIA

On importing a video, the flow is:

1. User chooses an active-bag **ClubInstance** (or explicit other owned club / no club entered), shot, angle (DTL/FO/unknown), optional reported strike or ball-flight, and target. If no club has been added, offer `Add a club` without blocking general body-pose analysis.
2. App copies the chosen clip into private storage and records duration, codec, dimensions, timestamps/FPS, file hash, consent and estimated size.
3. Visible video-quality and camera framing report. User may correct metadata or proceed in limited mode.
4. Run on-device Vision pose inference, preserve landmark visibility/missingness and corrected image-space orientation.
5. Plot landmarks over video, step through frames and allow user to tag top/address/impact approximate events.
6. Produce only warranted measurements with units and source evidence. Where unsupported: a visible 'Can't determine that from this clip' card.
7. Save evidence, link findings to specific skills, compare with other *valid* footage, record user outcome and select one recommended drill. No numeric overall Swing Score invented for engagement.
8. Reopening an analysis works offline with original video, overlay and its algorithm version. Reanalysis retains prior result for audit; it does not rewrite history invisibly.

A successful MVP demo must show **real tracked body keypoints over an actually imported golf swing** (not placeholder dots), a useful time-stamped movement observation when possible, an appropriately refused unsupported clubface/path measurement, and persistent save/review. If no consented golf footage is present in the repo, require the tester to supply their own video; do not present synthetic pose output as proof of golf-swing analysis.

---

## 10. EXPLICIT BUILD ORDER AND DEFINITION OF DONE

Do not attempt to implement everything at once with broken or fake integrations. Work in these checkpoints, completing and validating each as far as possible before moving on.

### M0 — inspect, design and scaffold

- Identify host OS, installed Xcode/xcodebuild, Swift toolchain, signing availability, repository contents and licences.
- Document assumptions; establish iOS target, app identifiers placeholders, workspace/project configuration, app colours, original identity, data schema and reference fixtures. Generate a real Xcode project and boot screen.
- Create README with exact reproducible steps to open/build/run on an iPhone and simulator; list Apple signing and optional iCloud entitlement steps. Add AGENTS.md and implementation checklist.
- Domain models and **empty production profile**, skippable persisted onboarding, every-type club-face catalogue, free-text Brand/Model fields **per club**, owned-club inventory and 14-club active bag builder. Use fictional, clearly labelled test fixtures only in tests, never production seed.

**M0 passes:** real app code and project scaffold exist, main navigation launches where toolchain permits; brand-new user receives **no pre-filled real-person profile**, can skip or complete onboarding, add a mixed-brand partial iron set and a custom club through visible clubface tiles, type a different Brand for each, select/deselect clubs into My Bag (max 14 competition clubs), relaunch without losing data, and no mock analysis appears as real.

### M1 — real offline video analyser (PRIMARY FIRST RELEASE)

- PhotosPicker import/Files optional, private video library, AVFoundation player and timeline, original video safety, thumbnails, angle selection, capture guidance and quality gates.
- 2D human pose engine with typed landmarks and true overlay aligned to pixels; stable background processing with progress/cancel.
- Basic defensible measurements and manual phase tagging; clear unsupported measurement presentation and first saved report.
- Multiple videos, comparison prototype, persistence, delete and error handling.

**M1 passes:** tester can import a real clip, see actual skeleton/observations, save/reopen and understand what's known vs unknown; offline; no fabricated metrics; tests for orientation, missing frames, storage and camera/view gating.

### M2 — curriculum and competency engine

- Authored beginner curriculum with valid source manifests and honest rights/link labels; original drill cards tailored to user.
- Implement the state machine, prerequisites, attempts, multi-session pass gates, personal baseline and regression/refresher engine with deterministic tests.
- Today recommendations and practice plan with manual outcome logging, session history and coach input/override.

**M2 passes:** watched lesson does not pass a skill; 3 valid assessments can achieve mastery where configured; one noisy swing cannot revoke it; repeated supported deterioration can flag a refresher; a subsequent pass clears the flag and preserves history.

### M3 — golf logging and actionable progress

- 9/18-hole round editor, **empty real-user round history until entered/imported**, optional user-entered historical rounds with clear provenance, putts/FIR denominators and missing values preserved; round snapshots preserve which club instances were in the bag.
- Score, putting, slice/playable outcomes, club gapping and drill adherence charts; export and import; source-linked explanation.
- Personal changes survive relaunch and app update.

**M3 passes:** fictional nine-hole and eighteen-hole **test fixture** totals/putts reconcile; missing data is never silently zero; raw data can be exported and restored; trends show sample size and no causal attribution; replacing a bag club never rewrites past round or video links.

### M4 — private iCloud sync and testing on physical iPhone

- After signed developer/capability prerequisites become available: compatible metadata sync, separately built private video backup, status indicators, retries, conflict and delete handling, restore tests across two devices or test identities as appropriate.
- Test flight only when user supplies Apple account/capabilities. No pretend success if prerequisites are missing.

**M4 passes:** real device A -> B data recovery tested; restored original video and analyses verified by hash; deleted recordings do not remain inaccurately listed; offline local use remains possible.

### M5 — advanced analyses / live capture (FUTURE, NO BLOCKING MVP)

- On-device camera preview, capture, optional real-time approximate pose overlay, capture quality guidance, hands-free start, device heat/battery considerations and safe setup for a solo golfer.
- Evaluate multi-view capture, custom club tracking and optional Apple Core ML models **only after** obtaining consented annotated footage, baseline benchmark performance and falsifiable validation thresholds. Do not announce exact impact/path/face measurements unless measured accurately against a reference standard.

### M6 — product-readiness (LATER)

- Privacy policy, robust backups, accessibility audits, crash/error logging only with opt-in, licensing audit, product branding, subscription architecture only if necessary, beta release planning and separation of personal profile data from generic curriculum.

---

## 11. TEST PLAN (WRITE AND EXECUTE)

Pure unit tests:
- **Catalogue completeness:** every enumerated category and club number has a stable type key and accessible tile; unknown/custom handled; brand/model stored separately per instance; two same-type different-brand clubs remain distinct; custom loft unknown does not become a fabricated number.
- **Bag builder:** owned and active-bag sets are separate; 0, 1, 14-club competition bag sizes work; 15th rejected with swap UI; presets switch consistently; past log references survive swap, archived club and migration; video/practice picker respects active bag with safe fallback.
- **Onboarding:** no original user information in production defaults; optional fields truly skippable; left-handed and right-handed views work; unknown units/handicap/rounds stay unknown; edits and profile-level preferences persist.
- Skill states, valid transitions, independent `contentComplete` vs `mastered` flags, prerequisites, evidence counts, calendar-day separation, cross-context transfer, versioned criteria and coach overrides.
- Regression: low-confidence clip => no flag; single anomaly => monitoring only; >=2 independent material declines => refresher when other conditions are met; successful refresher clears flag without deleting mastery; changed reference baseline prevents false alarm.
- No false club-path or face-angle output from Vision-only mode. Measurement output tied to supported camera angle and joint visibility.
- Joint coordinate mapping portrait/landscape/mirror, video rotation and missing landmark case. Distinguish video FPS from actual timestamps.
- Data migrations, lossless export/import, deduplication, edits, nullable puts/FIR and noncausal scoring narratives.
- Round arithmetic: use **fictional test-only** 9-/18-hole scores, correctly sum recorded putts and retain nulls where unrecorded; no fabricated production scores or handicap.
- Cloud layer works in local-only mode, handles unavailable network and missing entitlements without crashes; if configured test remote restore.

UI/integration tests:
- Browse generic illustrated club-face tiles -> choose a 5-iron -> enter Brand 'Example Maker A' -> add second 5-iron with Brand 'Example Maker B' -> select one into bag -> verify they're separate and survive relaunch.
- Choose a partial mixed-brand set, putter and custom driving iron; verify no automatic missing clubs; check wedge with unknown loft; archive a club without losing recorded shot data.
- Select 14 clubs, attempt 15th, confirm not inserted; swap one; create and switch named bag presets; choose club in video-import and round screens by `ClubInstanceID`.
- First launch -> **empty, skippable, editable onboarding** -> add clubs of different brands with a Brand textbox each -> select current bag -> relaunch persistence. No original requester details appear anywhere.
- Import video -> quality status -> process -> real joint overlay -> scrub and annotate -> save -> reopen -> delete.
- No permission granted / unsupported file / no human in frame / partial frame / occlusion / multi-person / video decode error / low disk space / cancellation -> intelligible recoverable message.
- Lesson external URL opens or gives polite error; paid link visibly labelled; no scraping/downloading.
- Log range results -> assessment -> mastery/refresher timeline updates properly.
- Enter a fictional nine-hole scorecard -> correct totals; missing putts omitted, not zero.
- Dynamic Type, VoiceOver, offline airplane-mode smoke test and battery/thermal behaviour where measurable.

Show the tests' actual command output or summary and specify unrun tests. Do not make arbitrary '95% swing accuracy' claims. If no Xcode is available, note that and identify which checks can be run and what remains to verify on a Mac/iPhone.

---

## 12. REFERENCE / IMPLEMENTATION RESEARCH

Read and use authoritative current API documentation as sources of truth (recheck for latest compatible Swift versions and deprecations rather than copying stale snippets):

- Apple Vision 2D: https://developer.apple.com/documentation/vision/detecting-human-body-poses-in-images
- Apple Vision 3D: https://developer.apple.com/documentation/vision/identifying-3d-human-body-poses-in-images
- Apple native example: https://developer.apple.com/documentation/vision/detecting-human-body-poses-in-3d-with-vision
- Apple video frames: https://developer.apple.com/documentation/avfoundation/creating-images-from-a-video-asset
- SwiftUI Photos picker: https://developer.apple.com/documentation/photokit/bringing-photos-picker-to-your-swiftui-app
- SwiftData: https://developer.apple.com/documentation/swiftdata/
- SwiftData iCloud sync limitations: https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices
- CloudKit video assets: https://developer.apple.com/documentation/cloudkit/ckasset
- MediaPipe Pose Landmarker iOS alternative: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/ios
- Apple developer requirements: https://developer.apple.com/help/account/membership/programs-overview
- YouTube API policy (if any embedding/API work): https://developers.google.com/youtube/terms/developer-policies-guide

Respect that Apple's 3D body pose from one view is an estimate. TrackMan's 3DMA uses **two calibrated cameras** and dedicated systems; it is not a fair comparator for an uncalibrated one-phone pose overlay. Avoid projecting scientific authority from those references to our own unvalidated app.

---

## 13. EXAMPLE END-TO-END BEHAVIOUR FOR DIFFERENT GOLFERS (FICTIONAL TEST SCENARIOS)

**Scenario A: first-time left-handed player creates a bag.** A new golfer opens the app, sets playing hand to left, skips height/handicap, chooses the individual tiles `Driver`, `5-hybrid`, `7-iron`, `9-iron`, `Sand Wedge` and `Putter`. They type different brands and models in the **Brand** and **Model** fields on each selected club (or leave Unknown). Only those six clubs enter **My Clubs**. They toggle five into **My Bag**, leaving one owned but not currently carried. The app shows `5 / 14`, supports a club swap, retains edits after relaunch and never inserts someone else's equipment, distance or coaching issue.

**Scenario B: improving golfer with a slice.** This user reports a driver that sometimes starts straight then curves right. After selecting the actual driver instance in their bag, they open a verified PGA drill and log 20 genuine outcomes. Imported face-on/down-the-line video yields only supported pose observations, not invented face-to-path data. Three sufficiently spaced successful assessments can eventually master the appropriate level; a beginner in other areas remains at a beginner level only there.

**Scenario C: mastered golfer later needs a targeted refresher.** A comparable personal best swing baseline and repeated verified skill results are recorded. At a later date, two well-matched high-quality clips indicate a defensible *body-movement* change and multiple practice sessions also show poorer real shot outcomes. The app flags **refresher recommended**, cites evidence, provides a short drill and reassessment, and preserves original mastery. A different camera angle or one bad session does not automatically trigger it.

**Scenario D: putting improves.** A golfer with a putting mat records indoor 3–5 ft start-line and pace challenges and passes a series of assessments. The app grants **indoor straight-putting mastery** for that specific level, not automatic mastery on sloped outdoor greens. If the user does not own a putting mirror, the app does not insist on one.

**Scenario E: mismatched gapping.** A player records acceptable iron contact but approaches often finish short. The app checks whether the selected iron has measured carry vs guessed total distance, asks about wind/lie/strike, and suggests data collection instead of declaring their height requires longer irons. Missing or questionable measurements remain unknown.

**Scenario F: changed bag and coach input.** An intermediate golfer replaces an old 5-wood with a second hybrid. The new club's **ClubInstanceID** creates a distinct performance history. Their old 5-wood video evidence remains connected to the archived club, and active practice recommendations switch to their current bag. Their qualified coach documents that a body motion is intentional, so the app records an approved, versioned reference rather than repeatedly flagging it as a flaw.

**Scenario G: multiple clubs, bag limit and unusual gear.** A golfer owns 22 clubs, including two drivers, duplicate 7-irons from different brands, a 16-degree driving iron, wedge labelled only 'W', and a custom chipper. Every individual club can have its own Brand text field. They can store all 22 in My Clubs, build one 14-club Everyday bag plus a 7-club Par-3 preset, and encounter a clear 'swap/remove first' warning if they try to add a 15th club to the Everyday competitive bag. A driving iron stays labelled driving iron regardless of loft, and 'W' does not acquire an invented loft.

---

## 14. FAILURE PREVENTION, DATA INTEGRITY AND NON-GOALS

Critical mistakes to avoid:

- Claiming full swing biomechanics from one standard 2D clip.
- Saying Vision 3D estimates are ground truth, accurate joint rotations or verified club tracking.
- Turning video skeletons into invented attack angle, club path, face angle, spin or club speed.
- Coding fixed universal perfect postures; forcing joint angles incompatible with personal mobility.
- Treating video-course completion as skill mastery.
- Flagging regression on one bad day or on mismatched camera views/clubs.
- Repeating beginner training endlessly despite high-quality evidence.
- Sending private swing footage to remote AI/services without opt-in.
- Downloading/copying Me and My Golf's paid coaching videos, unauthorised embeds, scraped transcripts or branded UI.
- Assuming free iCloud/CloudKit capabilities are active or storing photos/videos directly as giant SwiftData blobs.
- Recording missing putts/fairways as zero, inventing clubs/lofts/carry data, auto-inserting someone else's equipment or scores, or manufacturing an official handicap.
- Overcomplicated logging on the course, plans recommending clubs a user does not own, unnecessary paywalls or subscription dependencies.
- Writing only documentation, pretending fake API calls returned data, reporting nonexistent tests as passed.

Do not make a public multi-user marketplace, Swing Score gimmick, automatic caddie making up GPS distances or licence-infringing training content in the first release. Keep them as separately justified future ideas.

---

## 15. EXPECTED DELIVERABLES AND FINAL STATUS RESPONSE

You must produce **actual files in the repository**, not just a chat answer:

1. Native iPhone application source and Xcode project/workspace capable of being opened in Xcode.
2. Fully working **blank first-run onboarding** for any golfer, a complete club-face catalogue, editable **Brand and Model text boxes for every selected club**, persistent My Clubs inventory, and selectable 14-club My Bag with named presets, multiple instances and history-safe archiving. No original developer/player profile is preloaded.
3. First working local imported-video analysis pipeline with truthful Apple Vision keypoint overlay and limitations.
4. Curriculum content models and a seed library of original drill cards plus verified external links.
5. Persisted skills/evidence/progression/refresher engine and tests.
6. Round/practice capture and useful trends as development milestones permit.
7. Optional CloudKit integration behind a configuration gate, with clear setup and honest sync status.
8. Clear architecture, sources, measurement validity, privacy, build instructions, data dictionary and release checklist.
9. `IMPLEMENTATION_STATUS.md` listing `DONE`, `PARTIAL`, `NOT STARTED`, `BLOCKED EXTERNALLY` for every milestone; blockers with exact owner action.
10. A real run/test report, no hallucinated claims, and next **three executable development steps**.

**Begin now:** inspect the repository; identify your build environment; write the implementation checklist; implement **M0 with the complete first-run onboarding, club-face tiles, individual Brand fields and My Bag selection**, then **M1 real swing-video analysis** before spending effort on cosmetic charts or live camera analysis. Where possible, run actual tests and fix issues. Continue into later milestones only after real lower-level functionality exists. If external tools/accounts are missing, do not stop with a question or a spec; leave all feasible source code and actionable Apple build steps in place.

**Non-negotiable outcome:** An installable iPhone app with real imported-golf-video body tracking, personalised learning and defensible improvement tracking — progressively upgraded into a trustworthy long-term private golf coach. Evidence, human coaching input, repeatable results, privacy and accuracy take priority over flashy but misleading AI claims.
