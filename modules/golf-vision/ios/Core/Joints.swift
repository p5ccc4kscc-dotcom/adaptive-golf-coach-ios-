import Vision

/// The 19 body joints returned by Apple Vision's 2D body-pose request, in the fixed order used
/// for the flat per-frame arrays sent to JavaScript (`src/domain/pose/joints.ts` mirrors it).
/// Left/right are the *subject's* left and right, as Vision labels them.
public enum PoseJoints {
  public static let names: [String] = [
    "nose", "leftEye", "rightEye", "leftEar", "rightEar", "neck",
    "leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftWrist", "rightWrist",
    "root", "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle",
  ]

  public static let visionNames: [VNHumanBodyPoseObservation.JointName] = [
    .nose, .leftEye, .rightEye, .leftEar, .rightEar, .neck,
    .leftShoulder, .rightShoulder, .leftElbow, .rightElbow, .leftWrist, .rightWrist,
    .root, .leftHip, .rightHip, .leftKnee, .rightKnee, .leftAnkle, .rightAnkle,
  ]
}
