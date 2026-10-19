# Measurement validity

These rules govern the analyser. What M1a implements is listed at the end.

- **Tier A (pose, view-gated, may be reported with limitations):** projected head displacement
  relative to address (as a share of shoulder width); hip/knee projection; shoulder-line and
  torso inclination change; posture change between golfer-marked phases; tempo only when
  phase timing is defensible. Each is labelled as a 2D image-plane projection from a stated
  camera view.
- **Tier B (not measured until custom club tracking is validated):** shaft orientation,
  clubhead trail, attack angle, exact impact frame, release timing.
- **Tier C (never measured from body-pose video):** clubface angle, club path, face-to-path,
  spin, ball/club speed, carry, smash factor, lie at impact, strike location, pressure/ground
  forces. The UI shows “Can't determine that from this clip”.
- Body movement **is not evidence** of clubface control, ball flight or a corrected slice.
  Ball flight is recorded as the golfer's observation.
- Until a consented, manually annotated set of real swings has been reviewed (reporting false
  alarms, missed detections, cross-view disagreement and sample size), automatic labels read
  “movement observation”, never “fault”.
- Synthetic frames may test software mechanics only. They are never presented as validation.

**Needed from the owner for M1 validation:** your own swing clips (face-on and down-the-line,
ideally slow-motion and normal speed), with consent to use them for testing.

## Implemented in M1a (prototype; thresholds unvalidated)

| Measure | Basis | Scale / unit | Views | Notes |
|---|---|---|---|---|
| 19 body joints per frame | Detected 2D (Apple Vision) | normalised image coordinates + confidence | all | below 0.3 confidence = missing; nothing interpolated |
| Swing-phase candidates (address, top, impact, finish) | Estimated | s ± (frame spacing; + 0.1 s address/finish) | all | from the hands' path; golfer can mark frames instead (“Marked by you”) |
| Backswing and downswing time, tempo ratio | Estimated | s, ratio, with uncertainty | all | only when both phases exist |
| Head movement address → top / impact | Calculated 2D | torso lengths (neck–hip centre) | all | straight-line movement in the picture; depth not seen |
| Head movement towards the target | Calculated 2D | % of shoulder width at address | **face-on only**, hand required | target side taken from the detected lead/trail shoulders |
| Trunk tilt from vertical at address / top / impact | Calculated 2D | degrees | all (wording differs: DTL ≈ forward bend, FO ≈ side bend) | not a 3D spine angle |
| Lead-arm elbow angle at the top | Calculated 2D | degrees | all, hand required | foreshortening warning |
| Tier C items | Unavailable | — | — | always listed as not measurable |

Every value is labelled as an **observation**. `toObservations` marks them `reliability: unvalidated`
and `eligibleAsMasteryEvidence: false`. No fault labels exist in M1a.

**Validation still required (owner's consented clips):**
- landmark placement checked frame by frame;
- phase candidate error against frames you mark by hand;
- the false-alarm and no-detection rate per view;
- agreement between face-on and down-the-line clips of the same swing.

Until that review is done, no threshold is tightened or used for coaching.
