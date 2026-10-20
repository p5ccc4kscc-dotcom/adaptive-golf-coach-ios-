# M1a — Swing analyser technical prototype

_Status: built and tested on macOS and in CI. **Not yet run on a physical iPhone.** Device test:
[`M1A_DEVICE_TEST_PLAN.md`](M1A_DEVICE_TEST_PLAN.md); how to install: `BUILD_AND_RUN.md` → TestFlight setup._

## What it does (iPhone app only)

1. **Import** one swing video from Photos (`expo-image-picker`, passthrough export, “current”
   representation). BadGolfer keeps a private copy in the app's documents folder; the original in
   Photos is never changed.
2. **Reads real metadata** from the file with AVFoundation: duration, stored and display size,
   rotation (from the track's `preferredTransform`), mirroring, nominal frame rate, minimum frame
   duration, codec, file size and audio. The frame count is shown as an estimate (duration × fps).
3. **Asks for context** before analysing, as spec §4.2 requires: the club (from My Bag, another
   owned club, or “Unknown”), intended shot type and camera angle (face-on, down the line, other).
   The playing hand comes from the profile when known and can be changed per video; it is never
   guessed.
4. **Analyses on the device:**
   - AVAssetReader decodes frames in order, with their **exact presentation timestamps**.
   - Apple Vision `VNDetectHumanBodyPoseRequest` runs on each kept frame, with the track
     orientation passed in, so joints come back in the upright picture.
   - It returns the **19 joints with confidence**. Joints Vision didn't find stay missing, and
     joints with confidence below 0.3 are treated as missing. Nothing is interpolated or smoothed.
   - If several people are in view, the largest is used, and the count is reported.
   - **Sampling (spec §4.1):** clips of up to 900 frames are analysed frame by frame. Longer or
     slow-motion clips get a 30 fps pass to find the swing, then a full-rate pass over the swing
     window (from 0.5 s before address to 0.6 s after the finish).
   - It shows progress, can be **cancelled** before any frame, and stops at 1,800 frames, saying
     so.
   - Unsupported or unreadable files, missing files and Vision failures produce coded errors
     that are shown and recorded.
5. **Quality checks:**
   - video: too short (blocks analysis), long clip, low frame rate, low resolution;
   - tracking: how often a person was found, multiple people in view, wrists and trunk tracked.
   - If tracking is “unusable”, no results are shown.
6. **Swing-phase candidates:** address, top, impact and finish, from the path of the
   hands (the mid-point of the wrists). Each comes with **± uncertainty** (frame spacing, plus
   0.1 s for address and finish) and a confidence of “low” or “medium”, never “high”. If the data
   cannot support a phase, it is reported as not found, with the reason.
   - **The golfer can mark any frame as a phase**. Marks replace the candidate, are labelled
     “Marked by you”, and are kept append-only.
7. **Viewer:**
   - shows the exact analysed frame, extracted by AVAssetImageGenerator with zero time
     tolerance, with the detected joints and skeleton drawn over **that** frame;
   - has a 44 pt scrub bar, single-frame steps and jumps to each phase;
   - lists the joints not detected in each frame.
8. **Measurements**, each labelled with its basis:
   - *Estimated:* backswing and downswing time, and tempo ratio, with uncertainty.
   - *Calculated from 2D landmarks:*
     - head movement in torso lengths;
     - **face-on** head movement towards the target as a share of shoulder width. The target
       side comes from the detected lead and trail shoulders, not an assumption;
     - trunk tilt from vertical at address, top and impact, with view-specific wording;
     - lead-arm elbow angle at the top (only when the hand is known).
   - *Never measured:* clubface angle, club path, face-to-path, clubhead and ball speed, spin,
     launch, carry and strike location. These are always listed as not measurable from body
     tracking.
9. **Compare two swings:** chosen side by side at the same phase, with differences (B − A).
   - Timing is compared across camera angles.
   - 2D angles and positions are compared only when both clips use the same angle.
   - A difference within the timing uncertainty is called “not a meaningful difference”.
10. **History is kept:**
    - every run (completed, failed, cancelled) is a new row, so re-analysing never overwrites;
    - a club linked to a video is archived, not deleted.
11. **Private and deletable (owner requirement, 2026-10-20):**
    - **Delete this video** permanently removes the private copy, the extracted frame images and
      every analysis, phase mark and landmark record of that video.
    - **Delete all my data** removes every copy, the frame and picker caches, and all records.
    - The picker's temporary copy is removed right after import.
    - Settings shows how many videos and MB are stored, so you can check deletion on the iPhone.
      See `PRIVACY_SECURITY.md`.
12. **Share test summary:** a text report per analysis for the device test (processing time,
    detection rates, phase candidates against your marks).

In the browser preview, Expo Go and tests the module does not exist. The Analyse tab then says why,
and shows no import button and no results.

## Architecture

```
modules/golf-vision/                 local Expo module (autolinked)
  ios/GolfVisionModule.swift         Expo bridge: probeVideo, analyzePose (+ progress events),
                                     cancelAnalysis, extractFrame; background queue; coded errors
  ios/Core/*.swift                   platform-independent core (AVFoundation + Vision, no Expo)
  ios/Package.swift, ios/Tests/      `swift test` of the core on macOS and the iOS Simulator
  index.ts                           requireOptionalNativeModule → null where absent
src/domain/pose/                     pure TypeScript: decode, quality, phases, sampling,
                                     measures, compare (unit-tested)
src/services/swingAnalysis.ts        import + copy, run (one or two passes), cancel, frames, delete
src/data/repositories/swingRepository.ts   SQL for swing_video, pose_analysis,
                                     pose_phase_mark, pose_frame_data (schema v3)
src/features/analyse/                Analyse tab, video screen, viewer, compare
```

The Swift module is small and isolated. The app is still React Native + Expo + TypeScript.

## What has been validated, and how

| Claim | Evidence | Where |
|---|---|---|
| The module compiles with Expo SDK 57 and is autolinked | `expo prebuild` + `pod install` list GolfVision in `Podfile.lock`; `xcodebuild` builds the app for the iOS Simulator (unsigned) | CI “iOS native (macOS)” → *Build the iOS app with the native module* |
| Metadata is read from the file | 2 s, 30 fps, 640×360 clip stored with a 90° transform → duration 2.0 s, 30 fps, display 360×640, rotation 90, codec avc1 | `swift test` on macOS and on the iOS Simulator |
| Timestamps are exact, and sampling honours the rate cap | 240 fps clip: 120 frames at i/240 s (±1 µs); capped at 60 fps → 30 frames at i/60 s; frame limit → truncated | macOS |
| No person → no detection | Flat-colour video: 0 people and no confident joints in every frame | macOS |
| Real person detected, joints upright for **every rotation** | Real photograph of a person (Apache-2.0 test image, checksum-verified, not committed), encoded as H.264 video at 0°, 90°, 180° and 270° track rotation. A person is found in all four; head above hips above ankles in the upright picture; each joint within 0.04 of the 0° result | macOS (Apple Vision) |
| Frames extracted upright and exact | Portrait test clip: extracted frame is 360×640, red top and blue bottom, at the requested time | macOS and iOS Simulator |
| Cancellation, missing and invalid files | Cancels after 5 frames with ERR_CANCELLED; coded errors for missing and non-video files | macOS (cancel) / both (errors) |
| Phases, measurements, comparison, quality, sampling | Unit tests on **synthetic test data** (`tests/fixtures/syntheticSwing.ts`): logic only, not validation of swing diagnostics | Jest |
| Storage, history, upgrade | v2 → v3 database upgrade keeps clubs and bags; every run kept; marks append-only; export and delete | Jest (real SQLite) |

**Found while testing:** Apple Vision body pose **does not run on the iOS Simulator** (“Unable to
setup request in VNDetectHumanBodyPoseRequest”). The Vision tests are skipped there with that
reason, and pass on macOS. On a real iPhone this is expected to work, but that is **not yet
verified**.

## Not validated / known limitations

- **No physical-iPhone run yet.** Performance (frames per second of analysis), memory on long 4K
  or 240 fps clips, thermal behaviour, Photos import of iCloud-only videos, HEVC/HDR and
  Cinematic clips: all untested.
- The phase rules have only been checked on synthetic motion, where address lags by about 0.07 s
  and the finish comes about 0.04 s early. Their accuracy on real swings is unknown until your
  clips are reviewed against hand-marked frames.
- **All thresholds are engineering defaults, not validated:** confidence 0.3, quality rates and
  the phase rules (`src/domain/pose/*.ts`).
- Measurements are **2D image-plane** values. They change with camera height, distance and lens,
  and are not 3D biomechanics. Vision's left/right labels can swap in down-the-line views.
- Mirrored (front-camera) videos: the orientation logic handles a mirrored transform, but only
  the un-rotated mirrored case is unit-tested.
- Non-square pixels and crop metadata are not handled (iPhone footage uses square pixels).
- No smoothing and no joint trails yet; transition, halfway-back and P-positions beyond the four
  phases are not offered.
- Video playback with sound is not included; the viewer steps through analysed frames.
- Nothing here is coaching. Observations go to the future coaching engine marked “unvalidated,
  not mastery evidence” (`toObservations`).

## Device test

See [`M1A_DEVICE_TEST_PLAN.md`](M1A_DEVICE_TEST_PLAN.md).
