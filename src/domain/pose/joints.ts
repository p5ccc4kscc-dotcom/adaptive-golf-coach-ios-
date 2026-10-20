/**
 * Apple Vision 2D body-pose joints, in the order the native module sends them
 * (modules/golf-vision/ios/Core/Joints.swift). Left and right are the
 * golfer's own left and right as Vision labels them.
 */
export const JOINTS = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'neck',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'root',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
] as const;
export type Joint = (typeof JOINTS)[number];

export const JOINT_INDEX: Record<Joint, number> = Object.fromEntries(JOINTS.map((j, i) => [j, i])) as Record<Joint, number>;

/** Lines drawn between joints in the overlay. */
export const SKELETON: readonly [Joint, Joint][] = [
  ['nose', 'neck'],
  ['neck', 'leftShoulder'],
  ['neck', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['neck', 'root'],
  ['root', 'leftHip'],
  ['root', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
];

export const JOINT_LABELS: Record<Joint, string> = {
  nose: 'Nose',
  leftEye: 'Left eye',
  rightEye: 'Right eye',
  leftEar: 'Left ear',
  rightEar: 'Right ear',
  neck: 'Neck',
  leftShoulder: 'Left shoulder',
  rightShoulder: 'Right shoulder',
  leftElbow: 'Left elbow',
  rightElbow: 'Right elbow',
  leftWrist: 'Left wrist',
  rightWrist: 'Right wrist',
  root: 'Hip centre',
  leftHip: 'Left hip',
  rightHip: 'Right hip',
  leftKnee: 'Left knee',
  rightKnee: 'Right knee',
  leftAnkle: 'Left ankle',
  rightAnkle: 'Right ankle',
};

/** The lead side is the golfer's left for a right-hander and their right for a left-hander. */
export function leadSide(hand: 'right' | 'left'): 'left' | 'right' {
  return hand === 'right' ? 'left' : 'right';
}

export function sideJoint(side: 'left' | 'right', part: 'Shoulder' | 'Elbow' | 'Wrist' | 'Hip' | 'Knee' | 'Ankle'): Joint {
  return `${side}${part}` as Joint;
}
