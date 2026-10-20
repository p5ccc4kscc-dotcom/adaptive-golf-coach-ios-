import CoreGraphics
import ImageIO

/// How a video track's stored pixels must be turned to appear upright, derived from its
/// `preferredTransform`. iPhone portrait clips are usually stored landscape with a 90° transform.
public struct TrackOrientation: Equatable {
  /// Clockwise rotation from stored pixels to display: 0, 90, 180 or 270.
  public let rotationDegrees: Int
  public let mirrored: Bool

  public init(rotationDegrees: Int, mirrored: Bool) {
    self.rotationDegrees = rotationDegrees
    self.mirrored = mirrored
  }

  public init(transform t: CGAffineTransform) {
    let det = t.a * t.d - t.b * t.c
    mirrored = det < 0
    // For a mirrored transform, measure the rotation of the un-mirrored part (flip x first).
    let a = mirrored ? -t.a : t.a
    let b = mirrored ? -t.b : t.b
    var degrees = Int((atan2(Double(b), Double(a)) * 180 / .pi).rounded())
    degrees = ((degrees % 360) + 360) % 360
    // Snap to the nearest quarter turn; phone video only uses quarter turns.
    rotationDegrees = ((degrees + 45) / 90 % 4) * 90
  }

  /// The orientation to pass to Vision with the stored pixel buffer so that Vision works in the
  /// upright (display) image space. Same semantics as EXIF orientation.
  public var imageOrientation: CGImagePropertyOrientation {
    switch (rotationDegrees, mirrored) {
    case (0, false): return .up
    case (90, false): return .right
    case (180, false): return .down
    case (270, false): return .left
    case (0, true): return .upMirrored
    case (90, true): return .rightMirrored
    case (180, true): return .downMirrored
    default: return .leftMirrored
    }
  }

  /// Size of the upright image for stored pixels of `natural` size.
  public func displaySize(natural: CGSize) -> CGSize {
    rotationDegrees % 180 == 0 ? natural : CGSize(width: natural.height, height: natural.width)
  }
}
