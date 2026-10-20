import AVFoundation
import CoreVideo
import Foundation
import Vision

public struct PoseAnalysisOptions: Equatable {
  /// Analyse at most this many frames per second of video time (nil = every decoded frame).
  public var maxFramesPerSecond: Double?
  /// Stop after this many analysed frames; the result is then marked `truncated`.
  public var maxFrames: Int
  public var startSeconds: Double?
  public var endSeconds: Double?

  public init(maxFramesPerSecond: Double? = nil, maxFrames: Int = 1800, startSeconds: Double? = nil, endSeconds: Double? = nil) {
    self.maxFramesPerSecond = maxFramesPerSecond
    self.maxFrames = maxFrames
    self.startSeconds = startSeconds
    self.endSeconds = endSeconds
  }
}

/// One analysed frame. `points` is PoseJoints.names.count × 3 values (x, y, confidence) in the
/// upright display image, normalised 0–1 with the origin at the TOP-LEFT. A joint Vision did not
/// find is (-1, -1, 0). Nothing is interpolated or smoothed here.
public struct PoseFrame: Equatable {
  public let timeSeconds: Double
  public let decodedFrameIndex: Int
  public let bodiesDetected: Int
  public let points: [Float]

  public var dictionary: [String: Any] {
    ["t": timeSeconds, "i": decodedFrameIndex, "n": bodiesDetected, "p": points.map { Double($0) }]
  }
}

public struct PoseAnalysisResult {
  public let video: VideoInfo
  public let frames: [PoseFrame]
  public let decodedFrames: Int
  public let truncated: Bool
  public let visionRevision: Int
  public let processingSeconds: Double

  public var dictionary: [String: Any] {
    [
      "video": video.dictionary,
      "frames": frames.map { $0.dictionary },
      "decodedFrames": decodedFrames,
      "truncated": truncated,
      "engine": "apple_vision_body_pose_2d",
      "visionRevision": visionRevision,
      "jointOrder": PoseJoints.names,
      "processingSeconds": processingSeconds,
    ]
  }
}

public enum PoseAnalyzer {
  public static var visionRevision: Int { VNDetectHumanBodyPoseRequest.currentRevision }

  /// Decodes the video frame by frame with exact presentation timestamps and runs Apple Vision
  /// 2D body-pose detection on each kept frame. `isCancelled` is checked before every frame.
  public static func analyze(
    url: URL,
    options: PoseAnalysisOptions = PoseAnalysisOptions(),
    progress: ((_ analysed: Int, _ estimatedTotal: Int) -> Void)? = nil,
    isCancelled: () -> Bool = { false }
  ) throws -> PoseAnalysisResult {
    let started = Date()
    let info = try VideoProbe.probe(url: url)
    let asset = try VideoProbe.asset(for: url)
    let track = try VideoProbe.videoTrack(of: asset)
    let orientation = TrackOrientation(transform: track.preferredTransform)

    let reader: AVAssetReader
    do {
      reader = try AVAssetReader(asset: asset)
    } catch {
      throw GolfVisionError.unreadable(error.localizedDescription)
    }
    if options.startSeconds != nil || options.endSeconds != nil {
      let start = CMTime(seconds: max(0, options.startSeconds ?? 0), preferredTimescale: 600)
      let end = options.endSeconds.map { CMTime(seconds: $0, preferredTimescale: 600) } ?? asset.duration
      reader.timeRange = CMTimeRange(start: start, end: end)
    }
    let output = AVAssetReaderTrackOutput(
      track: track,
      outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    )
    output.alwaysCopiesSampleData = false
    guard reader.canAdd(output) else { throw GolfVisionError.unreadable("cannot decode this video track") }
    reader.add(output)
    guard reader.startReading() else {
      throw GolfVisionError.readerFailed(reader.error?.localizedDescription ?? "could not start reading")
    }

    let minInterval = options.maxFramesPerSecond.map { 1.0 / max($0, 0.001) } ?? 0
    let keptDuration = (options.endSeconds ?? info.durationSeconds) - (options.startSeconds ?? 0)
    let effectiveFps = options.maxFramesPerSecond.map { min($0, max(info.nominalFrameRate, 1)) } ?? max(info.nominalFrameRate, 1)
    let estimatedTotal = min(options.maxFrames, max(1, Int((keptDuration * effectiveFps).rounded())))

    var frames: [PoseFrame] = []
    var decoded = 0
    var lastKept = -Double.infinity
    var truncated = false

    while true {
      if isCancelled() {
        reader.cancelReading()
        throw GolfVisionError.cancelled
      }
      guard let sample = output.copyNextSampleBuffer() else { break }
      defer { decoded += 1 }
      let t = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))
      guard t.isFinite, let pixels = CMSampleBufferGetImageBuffer(sample) else { continue }
      // Keep a frame only when it is at least `minInterval` after the last kept one
      // (a small tolerance absorbs timestamp rounding).
      if minInterval > 0 && t - lastKept < minInterval - 0.0005 { continue }
      if frames.count >= options.maxFrames {
        truncated = true
        reader.cancelReading()
        break
      }
      lastKept = t
      frames.append(try detect(pixels: pixels, orientation: orientation, time: t, index: decoded))
      progress?(frames.count, estimatedTotal)
    }
    if reader.status == .failed {
      throw GolfVisionError.readerFailed(reader.error?.localizedDescription ?? "unknown decoder error")
    }
    frames.sort { $0.timeSeconds < $1.timeSeconds }
    return PoseAnalysisResult(
      video: info,
      frames: frames,
      decodedFrames: decoded,
      truncated: truncated,
      visionRevision: visionRevision,
      processingSeconds: Date().timeIntervalSince(started)
    )
  }

  /// Runs Vision on one stored pixel buffer. Points come back in the upright image because the
  /// track orientation is passed to Vision; they are flipped to a top-left origin.
  public static func detect(pixels: CVPixelBuffer, orientation: TrackOrientation, time: Double, index: Int) throws -> PoseFrame {
    let request = VNDetectHumanBodyPoseRequest()
    let handler = VNImageRequestHandler(cvPixelBuffer: pixels, orientation: orientation.imageOrientation, options: [:])
    do {
      try handler.perform([request])
    } catch {
      throw GolfVisionError.visionFailed(error.localizedDescription)
    }
    let observations = request.results ?? []
    let primary = observations.max { area($0) < area($1) }
    var points = [Float](repeating: -1, count: PoseJoints.names.count * 3)
    for i in 0..<PoseJoints.names.count { points[i * 3 + 2] = 0 }
    if let primary, let recognised = try? primary.recognizedPoints(.all) {
      for (i, name) in PoseJoints.visionNames.enumerated() {
        guard let p = recognised[name], p.confidence > 0 else { continue }
        points[i * 3] = Float(p.location.x)
        points[i * 3 + 1] = Float(1 - p.location.y)
        points[i * 3 + 2] = p.confidence
      }
    }
    return PoseFrame(timeSeconds: time, decodedFrameIndex: index, bodiesDetected: observations.count, points: points)
  }

  /// Spread of the confidently detected joints; the largest person in view is treated as the golfer.
  static func area(_ o: VNHumanBodyPoseObservation) -> CGFloat {
    guard let pts = try? o.recognizedPoints(.all).values.filter({ $0.confidence > 0.1 }), !pts.isEmpty else { return 0 }
    let xs = pts.map { $0.location.x }
    let ys = pts.map { $0.location.y }
    return (xs.max()! - xs.min()!) * (ys.max()! - ys.min()!)
  }
}
