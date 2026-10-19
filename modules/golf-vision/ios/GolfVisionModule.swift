import ExpoModulesCore
import Foundation

/// Options for `analyzePose`, decoded from the JavaScript object.
struct AnalyzeOptionsRecord: Record {
  @Field var maxFramesPerSecond: Double? = nil
  @Field var maxFrames: Int = 1800
  @Field var startSeconds: Double? = nil
  @Field var endSeconds: Double? = nil
}

/// Job ids the golfer has cancelled. Checked by the analyser before every frame.
final class CancellationRegistry: @unchecked Sendable {
  private let lock = NSLock()
  private var cancelled = Set<String>()

  func cancel(_ id: String) { lock.lock(); cancelled.insert(id); lock.unlock() }
  func clear(_ id: String) { lock.lock(); cancelled.remove(id); lock.unlock() }
  func isCancelled(_ id: String) -> Bool { lock.lock(); defer { lock.unlock() }; return cancelled.contains(id) }
}

/// BadGolfer's on-device swing-video module: AVFoundation for metadata and exact frames, Apple
/// Vision for 2D body landmarks. All work happens on this device; nothing is uploaded.
public class GolfVisionModule: Module {
  private let queue = DispatchQueue(label: "app.badgolfer.golfvision", qos: .userInitiated)
  private let cancellations = CancellationRegistry()

  public func definition() -> ModuleDefinition {
    Name("GolfVision")

    Constant("engine") {
      ["name": "apple_vision_body_pose_2d", "visionRevision": PoseAnalyzer.visionRevision, "jointOrder": PoseJoints.names] as [String: Any]
    }

    Events("onAnalysisProgress")

    AsyncFunction("probeVideo") { (uri: String, promise: Promise) in
      self.queue.async {
        do {
          promise.resolve(try VideoProbe.probe(url: try GolfVisionModule.fileURL(uri)).dictionary)
        } catch {
          promise.reject(GolfVisionModule.exception(error))
        }
      }
    }

    AsyncFunction("analyzePose") { (jobId: String, uri: String, options: AnalyzeOptionsRecord, promise: Promise) in
      self.cancellations.clear(jobId)
      let opts = PoseAnalysisOptions(
        maxFramesPerSecond: options.maxFramesPerSecond,
        maxFrames: max(1, options.maxFrames),
        startSeconds: options.startSeconds,
        endSeconds: options.endSeconds
      )
      self.queue.async {
        var lastSent = Date.distantPast
        do {
          let result = try PoseAnalyzer.analyze(
            url: try GolfVisionModule.fileURL(uri),
            options: opts,
            progress: { analysed, total in
              let now = Date()
              guard now.timeIntervalSince(lastSent) > 0.15 else { return }
              lastSent = now
              self.sendEvent("onAnalysisProgress", ["jobId": jobId, "analysed": analysed, "estimatedTotal": total])
            },
            isCancelled: { self.cancellations.isCancelled(jobId) }
          )
          self.cancellations.clear(jobId)
          promise.resolve(result.dictionary)
        } catch {
          self.cancellations.clear(jobId)
          promise.reject(GolfVisionModule.exception(error))
        }
      }
    }

    Function("cancelAnalysis") { (jobId: String) in
      self.cancellations.cancel(jobId)
    }

    AsyncFunction("extractFrame") { (uri: String, seconds: Double, maxDimension: Int, promise: Promise) in
      self.queue.async {
        do {
          let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("golfvision-frames", isDirectory: true)
          let frame = try FrameExtractor.extract(url: try GolfVisionModule.fileURL(uri), seconds: seconds, maxDimension: maxDimension, into: dir)
          promise.resolve(frame.dictionary)
        } catch {
          promise.reject(GolfVisionModule.exception(error))
        }
      }
    }
  }

  static func fileURL(_ uri: String) throws -> URL {
    if uri.hasPrefix("file://"), let url = URL(string: uri) { return url }
    if uri.hasPrefix("/") { return URL(fileURLWithPath: uri) }
    throw GolfVisionError.fileNotFound(uri)
  }

  static func exception(_ error: Error) -> Exception {
    if let e = error as? GolfVisionError {
      return Exception(name: e.code, description: e.message, code: e.code)
    }
    return Exception(name: "ERR_GOLF_VISION", description: error.localizedDescription, code: "ERR_GOLF_VISION")
  }
}
