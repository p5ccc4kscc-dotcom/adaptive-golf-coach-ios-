import AVFoundation
import Foundation

/// Metadata read from the file itself. Nothing is estimated except `estimatedFrameCount`,
/// which is duration × nominal frame rate and is labelled as an estimate.
public struct VideoInfo: Equatable {
  public let durationSeconds: Double
  public let naturalWidth: Int
  public let naturalHeight: Int
  public let displayWidth: Int
  public let displayHeight: Int
  public let rotationDegrees: Int
  public let mirrored: Bool
  public let nominalFrameRate: Double
  public let minFrameDurationSeconds: Double?
  public let estimatedFrameCount: Int
  public let codec: String
  public let fileSizeBytes: Int64?
  public let hasAudio: Bool

  public var dictionary: [String: Any] {
    [
      "durationSeconds": durationSeconds,
      "naturalWidth": naturalWidth,
      "naturalHeight": naturalHeight,
      "displayWidth": displayWidth,
      "displayHeight": displayHeight,
      "rotationDegrees": rotationDegrees,
      "mirrored": mirrored,
      "nominalFrameRate": nominalFrameRate,
      "minFrameDurationSeconds": minFrameDurationSeconds as Any,
      "estimatedFrameCount": estimatedFrameCount,
      "codec": codec,
      "fileSizeBytes": fileSizeBytes.map { NSNumber(value: $0) } as Any,
      "hasAudio": hasAudio,
    ]
  }
}

public enum VideoProbe {
  public static func asset(for url: URL) throws -> AVURLAsset {
    if url.isFileURL && !FileManager.default.fileExists(atPath: url.path) {
      throw GolfVisionError.fileNotFound(url.path)
    }
    return AVURLAsset(url: url, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
  }

  public static func videoTrack(of asset: AVAsset) throws -> AVAssetTrack {
    guard let track = asset.tracks(withMediaType: .video).first else { throw GolfVisionError.noVideoTrack }
    return track
  }

  public static func probe(url: URL) throws -> VideoInfo {
    let asset = try asset(for: url)
    guard asset.isReadable else { throw GolfVisionError.unreadable("not readable by AVFoundation") }
    let track = try videoTrack(of: asset)
    let natural = track.naturalSize
    let orientation = TrackOrientation(transform: track.preferredTransform)
    let display = orientation.displaySize(natural: natural)
    let duration = CMTimeGetSeconds(asset.duration)
    let fps = Double(track.nominalFrameRate)
    let minFrame = track.minFrameDuration
    let codec: String = {
      guard let desc = track.formatDescriptions.first else { return "unknown" }
      let subtype = CMFormatDescriptionGetMediaSubType(desc as! CMFormatDescription)
      let chars = [24, 16, 8, 0].map { Character(UnicodeScalar(UInt8((subtype >> $0) & 0xFF))) }
      return String(chars).trimmingCharacters(in: .whitespaces)
    }()
    let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.int64Value
    return VideoInfo(
      durationSeconds: duration.isFinite ? duration : 0,
      naturalWidth: Int(natural.width.rounded()),
      naturalHeight: Int(natural.height.rounded()),
      displayWidth: Int(display.width.rounded()),
      displayHeight: Int(display.height.rounded()),
      rotationDegrees: orientation.rotationDegrees,
      mirrored: orientation.mirrored,
      nominalFrameRate: fps,
      minFrameDurationSeconds: minFrame.isValid && !minFrame.isIndefinite && minFrame.seconds > 0 ? minFrame.seconds : nil,
      estimatedFrameCount: duration.isFinite ? Int((duration * fps).rounded()) : 0,
      codec: codec,
      fileSizeBytes: size,
      hasAudio: !asset.tracks(withMediaType: .audio).isEmpty
    )
  }
}
