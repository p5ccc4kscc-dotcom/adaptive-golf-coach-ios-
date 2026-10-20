import AVFoundation
import Foundation
import ImageIO
import UniformTypeIdentifiers

public struct ExtractedFrame {
  public let fileURL: URL
  public let requestedSeconds: Double
  public let actualSeconds: Double
  public let width: Int
  public let height: Int

  public var dictionary: [String: Any] {
    ["uri": fileURL.absoluteString, "requestedSeconds": requestedSeconds, "actualSeconds": actualSeconds, "width": width, "height": height]
  }
}

/// Writes the exact frame at a timestamp (zero tolerance, upright) as a JPEG, for display under
/// the landmark overlay. The original video file is never modified.
public enum FrameExtractor {
  public static func extract(url: URL, seconds: Double, maxDimension: Int, into directory: URL) throws -> ExtractedFrame {
    let asset = try VideoProbe.asset(for: url)
    _ = try VideoProbe.videoTrack(of: asset)
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    if maxDimension > 0 { generator.maximumSize = CGSize(width: maxDimension, height: maxDimension) }
    var actual = CMTime.zero
    let image: CGImage
    do {
      image = try generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 60000), actualTime: &actual)
    } catch {
      throw GolfVisionError.frameExtractionFailed(error.localizedDescription)
    }
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let name = "frame-\(abs(url.path.hashValue))-\(Int((seconds * 1_000_000).rounded()))-\(maxDimension).jpg"
    let file = directory.appendingPathComponent(name)
    guard let dest = CGImageDestinationCreateWithURL(file as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
      throw GolfVisionError.frameExtractionFailed("could not create the image file")
    }
    CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { throw GolfVisionError.frameExtractionFailed("could not write the image file") }
    return ExtractedFrame(fileURL: file, requestedSeconds: seconds, actualSeconds: CMTimeGetSeconds(actual), width: image.width, height: image.height)
  }
}
