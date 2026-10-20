# M1a physical-device acceptance test (your iPhone)

**Status: not run yet.** It is run once the TestFlight build is installed
(`docs/BUILD_AND_RUN.md` → “TestFlight setup”). Nothing here is “passed” until you have run it.

Results from synthetic motion and static photographs (CI) prove the software mechanics only. They
are **not** evidence that swing analysis is accurate. This test is the first real evidence, and its
results are recorded as observations, not validation.

## Before you start

- Install **BadGolfer** from TestFlight. The iPhone app has its **own** data and starts blank. Your
  Safari preview data stays in Safari; there is no transfer yet.
- Record in your normal Camera app (not in BadGolfer), with your whole body and the club in view, on
  a steady support at about hand height. Film only yourself. Don't send me videos unless you
  want to; the test summary is enough.
- Clips needed (tick as you record):

  | # | View | Club | Camera setting | Orientation |
  |---|---|---|---|---|
  | C1 | Face-on | Iron | Video, 60 fps | Portrait |
  | C2 | Down the line | Iron | Video, 60 fps | Portrait |
  | C3 | Face-on | Driver | **Slo-mo 240 fps** | Portrait |
  | C4 | Down the line | Driver | Slo-mo 120 or 240 fps | Portrait |
  | C5 | Face-on | Any | Video | **Landscape** (phone on its side) |
  | C6 | Any | Any | Video, **dim light**, or partly out of frame | Portrait |
  | C7 | Any | Any | Video, **another person in view** | Portrait |
  | C8 | Any | Any | A long clip (30 s or more) with one swing in it | Portrait |

## How to record results

After each analysis, tap **Share test summary** and send it to me, or paste it into a note. It
contains:
- the video's details;
- the sampling plan;
- the processing time and frames per second;
- the detection rates;
- every phase candidate next to your mark, with the difference in seconds and frames.

It contains no video, file path or name. Also note the **Pass / Fail / Notes** for each test below
and take screenshots of anything wrong.

## Tests

| ID | Test | Steps | Expected | Record |
|---|---|---|---|---|
| D-1 | Import from Photos | Analyse → *Import a swing video from Photos* → pick C1 | Opens the video screen; duration, fps, size and portrait/landscape match the clip's info in Photos (swipe up on the clip in Photos) | Pass/Fail; any mismatch |
| D-2 | Genuine on-device analysis | Choose the club (or Unknown), shot and view → *Analyse on this iPhone*. Repeat with **Aeroplane Mode on** | Progress bar moves; finishes; a summary appears. Works the same in Aeroplane Mode (proves nothing is sent off the phone) | Processing time (from the summary); Pass/Fail |
| D-3 | Joint overlay accuracy | Step through about 10 frames across the swing (set-up, halfway back, top, downswing, impact, finish) | Dots sit on your joints. Missing joints are listed, not invented | For each frame: on / slightly off / wrong; which joints |
| D-4 | Frame stepping and time alignment | Use ◀ Frame / Frame ▶ and drag the bar | Time goes up by one frame (about 16.7 ms at 60 fps, 4.2 ms at 240 fps); the dots match **that** frame, including in the fast downswing (no lag behind the arms) | Pass/Fail; frames where the dots lag or jump |
| D-5 | Orientation | Analyse C1 (portrait) and C5 (landscape). Optional: a clip filmed upside-down or with the front camera | Frames upright; dots on the body in every case | Pass/Fail per clip |
| D-6 | Slow motion | Analyse C3 and C4 | The summary shows the high frame rate (about 120/240 fps) and the real-time duration. **If it shows 30 fps and a long duration, Photos handed over a slowed copy; please note it** | fps and duration shown; passes (1 or 2); time |
| D-7 | Face-on and down the line | C1–C4 with the correct view chosen | Face-on shows “Head movement towards the target”; down the line says it is face-on only. Trunk-tilt wording differs by view | Pass/Fail |
| D-8 | Phases and correction | For C1–C4: check address, top, impact and finish; where wrong, step to the right frame → *Mark this frame as…*; try *Use automatic* once | Candidates show ± uncertainty and “low/medium” confidence; your marks show “Marked by you”; measurements update | Difference per phase (from the summary) |
| D-9 | Comparison | Analyse → *Compare two swings*: C1 vs C2, then C1 vs C3 | Frames line up at the chosen phase. Different views: only timing compared, with a warning. Same view: 2D values too, and differences within the uncertainty are called “not meaningful” | Pass/Fail |
| D-10 | Saving and reopening | Force-quit BadGolfer (swipe it away), reopen; then restart the iPhone and reopen | Videos, analyses, marks and history are all still there | Pass/Fail |
| D-11 | Errors and cancellation | Start analysing C8 and tap *Cancel*; analyse C6 and C7; open the picker and cancel; trim a clip to under half a second and import it | Cancel stops it and history shows “cancelled”; C6/C7 give warnings (or “Tracking failed”, with no results) rather than confident numbers; picker cancel does nothing; the tiny clip cannot be analysed | Pass/Fail; messages shown |
| D-12 | iCloud-only video (if you use “Optimise iPhone Storage”) | Import an older clip not on the phone | It downloads and imports, or shows a clear error | Pass/Fail |
| D-13 | Long clip, performance | Analyse C8 | Two passes (finding the swing, then full detail); completes; the phone stays usable | Time; any heat or slowdown |
| D-P1 | Deleting a swing removes its files | Settings → note *Swing videos stored on this iPhone*. Delete one video (*Delete this video from BadGolfer*). Back to Settings | Video count and MB go down by that video; cached files are cleared; the other videos and their analyses remain | Before/after figures |
| D-P2 | Delete all my data | Settings → *Delete all my data* → confirm → reopen Settings | 0 videos, 0 MB, 0 cached files; the app is back at first launch; originals still in Photos | Before/after figures |

## What I do with your results

- I record every detection failure, inaccuracy and processing time in
  `docs/M1A_DEVICE_RESULTS.md`, from your summaries.
- I fix the bugs, then decide with you which thresholds need changing. None will be tightened
  from one clip.
- M1a is accepted only when you say so. M1b does not start before that.
