# Measurement validity (applies from M1)

Nothing in M0 measures a swing. The rules below govern the analyser when it is built.

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
