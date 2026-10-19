import AVFoundation
import ImageIO
import XCTest
@testable import GolfVisionCore

final class OrientationTests: XCTestCase {
  func testQuarterTurnsFromIPhoneStyleTransforms() {
    XCTAssertEqual(TrackOrientation(transform: .identity), TrackOrientation(rotationDegrees: 0, mirrored: false))
    XCTAssertEqual(TrackOrientation(transform: TestVideo.transform(for: 90, storedWidth: 1920, storedHeight: 1080)).rotationDegrees, 90)
    XCTAssertEqual(TrackOrientation(transform: TestVideo.transform(for: 180, storedWidth: 1920, storedHeight: 1080)).rotationDegrees, 180)
    XCTAssertEqual(TrackOrientation(transform: TestVideo.transform(for: 270, storedWidth: 1920, storedHeight: 1080)).rotationDegrees, 270)
    XCTAssertEqual(TrackOrientation(rotationDegrees: 90, mirrored: false).imageOrientation, .right)
    XCTAssertEqual(TrackOrientation(rotationDegrees: 270, mirrored: false).imageOrientation, .left)
    XCTAssertEqual(TrackOrientation(rotationDegrees: 90, mirrored: false).displaySize(natural: CGSize(width: 1920, height: 1080)), CGSize(width: 1080, height: 1920))
  }

  func testMirroredTransformIsDetected() {
    let o = TrackOrientation(transform: CGAffineTransform(a: -1, b: 0, c: 0, d: 1, tx: 1920, ty: 0))
    XCTAssertTrue(o.mirrored)
    XCTAssertEqual(o.rotationDegrees, 0)
    XCTAssertEqual(o.imageOrientation, .upMirrored)
  }
}

final class VideoPipelineTests: XCTestCase {
  func testProbeReadsTheFilesOwnMetadata() throws {
    let url = TestVideo.tempURL("probe")
    let stored = TestVideo.Raster.flat(width: 640, height: 360, r: 40, g: 120, b: 60)
    try TestVideo.write(stored, frameCount: 60, fps: 30, transform: TestVideo.transform(for: 90, storedWidth: 640, storedHeight: 360), to: url)
    let info = try VideoProbe.probe(url: url)
    XCTAssertEqual(info.durationSeconds, 2.0, accuracy: 0.05)
    XCTAssertEqual(info.nominalFrameRate, 30, accuracy: 0.5)
    XCTAssertEqual(info.naturalWidth, 640)
    XCTAssertEqual(info.naturalHeight, 360)
    XCTAssertEqual(info.displayWidth, 360)
    XCTAssertEqual(info.displayHeight, 640)
    XCTAssertEqual(info.rotationDegrees, 90)
    XCTAssertEqual(info.codec, "avc1")
    XCTAssertFalse(info.hasAudio)
  }

  func testTimestampsAreExactAndSamplingRespectsTheFrameRateCap() throws {
    let url = TestVideo.tempURL("hfr")
    try TestVideo.write(.flat(width: 320, height: 240, r: 200, g: 200, b: 200), frameCount: 120, fps: 240, transform: .identity, to: url)
    let all = try PoseAnalyzer.analyze(url: url)
    XCTAssertEqual(all.frames.count, 120)
    for (i, f) in all.frames.enumerated() { XCTAssertEqual(f.timeSeconds, Double(i) / 240, accuracy: 1e-6) }
    XCTAssertFalse(all.truncated)

    let capped = try PoseAnalyzer.analyze(url: url, options: PoseAnalysisOptions(maxFramesPerSecond: 60))
    XCTAssertEqual(capped.frames.count, 30)
    for (i, f) in capped.frames.enumerated() { XCTAssertEqual(f.timeSeconds, Double(i) / 60, accuracy: 1e-6) }

    let limited = try PoseAnalyzer.analyze(url: url, options: PoseAnalysisOptions(maxFrames: 10))
    XCTAssertEqual(limited.frames.count, 10)
    XCTAssertTrue(limited.truncated)
  }

  func testAVideoWithNobodyInItDetectsNobody() throws {
    let url = TestVideo.tempURL("empty")
    try TestVideo.write(.flat(width: 640, height: 480, r: 30, g: 90, b: 160), frameCount: 15, fps: 30, transform: .identity, to: url)
    let result = try PoseAnalyzer.analyze(url: url)
    XCTAssertEqual(result.frames.count, 15)
    for f in result.frames {
      XCTAssertEqual(f.bodiesDetected, 0)
      XCTAssertTrue(stride(from: 2, to: f.points.count, by: 3).allSatisfy { f.points[$0] == 0 }, "no joint may have confidence")
    }
  }

  func testCancellationStopsTheAnalysis() throws {
    let url = TestVideo.tempURL("cancel")
    try TestVideo.write(.flat(width: 320, height: 240, r: 0, g: 0, b: 0), frameCount: 60, fps: 30, transform: .identity, to: url)
    var seen = 0
    XCTAssertThrowsError(try PoseAnalyzer.analyze(url: url, progress: { n, _ in seen = n }, isCancelled: { seen >= 5 })) { error in
      XCTAssertEqual(error as? GolfVisionError, .cancelled)
    }
    XCTAssertEqual(seen, 5)
  }

  func testMissingAndInvalidFilesFailWithCodes() throws {
    XCTAssertThrowsError(try VideoProbe.probe(url: URL(fileURLWithPath: "/nonexistent/clip.mov"))) { error in
      XCTAssertEqual((error as? GolfVisionError)?.code, "ERR_FILE_NOT_FOUND")
    }
    let junk = TestVideo.tempURL("junk")
    try Data("not a video".utf8).write(to: junk)
    XCTAssertThrowsError(try VideoProbe.probe(url: junk))
    XCTAssertThrowsError(try PoseAnalyzer.analyze(url: junk))
  }

  func testFrameExtractionIsUprightAndExact() throws {
    // Top half red, bottom half blue in the upright image; stored rotated for a 90° portrait track.
    var upright = TestVideo.Raster.flat(width: 360, height: 640, r: 0, g: 0, b: 255)
    for y in 0..<320 { for x in 0..<360 { let i = (y * 360 + x) * 4; upright.rgba[i] = 255; upright.rgba[i + 2] = 0 } }
    let stored = upright.stored(forRotation: 90)
    let url = TestVideo.tempURL("extract")
    try TestVideo.write(stored, frameCount: 30, fps: 30, transform: TestVideo.transform(for: 90, storedWidth: stored.width, storedHeight: stored.height), to: url)
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("golfvision-frames-\(UUID().uuidString)")
    let frame = try FrameExtractor.extract(url: url, seconds: 10.0 / 30.0, maxDimension: 0, into: dir)
    XCTAssertEqual(frame.width, 360)
    XCTAssertEqual(frame.height, 640)
    XCTAssertEqual(frame.actualSeconds, 10.0 / 30.0, accuracy: 1e-3)
    let image = try TestVideo.Raster.load(path: frame.fileURL.path, width: 360, height: 640)
    XCTAssertGreaterThan(Int(image.pixel(180, 100)[image.pixel(180, 100).startIndex]), 200, "top of the upright frame is red")
    XCTAssertGreaterThan(Int(image.pixel(180, 540)[image.pixel(180, 540).startIndex + 2]), 200, "bottom of the upright frame is blue")
  }
}

/// Positive detection on a REAL photograph of a person (downloaded and checksum-verified by the CI
/// job; path in GOLFVISION_TEST_IMAGE). Checks that joints come back in upright display
/// coordinates for every track rotation.
final class RealPersonTests: XCTestCase {
  let joints = Dictionary(uniqueKeysWithValues: PoseJoints.names.enumerated().map { ($1, $0) })

  func point(_ f: PoseFrame, _ name: String) -> (x: Float, y: Float, c: Float) {
    let i = joints[name]! * 3
    return (f.points[i], f.points[i + 1], f.points[i + 2])
  }

  func testPersonIsDetectedAndJointsAreUprightForEveryRotation() throws {
    guard let path = ProcessInfo.processInfo.environment["GOLFVISION_TEST_IMAGE"] else {
      throw XCTSkip("GOLFVISION_TEST_IMAGE not set; the CI job provides it")
    }
    let upright = try TestVideo.Raster.load(path: path, width: 960, height: 640)
    var reference: PoseFrame?
    for r in [0, 90, 180, 270] {
      let stored = upright.stored(forRotation: r)
      let url = TestVideo.tempURL("person-\(r)")
      try TestVideo.write(stored, frameCount: 6, fps: 30, transform: TestVideo.transform(for: r, storedWidth: stored.width, storedHeight: stored.height), to: url)
      let result = try PoseAnalyzer.analyze(url: url)
      XCTAssertEqual(result.video.displayWidth, 960, "rotation \(r)")
      XCTAssertEqual(result.video.displayHeight, 640, "rotation \(r)")
      let f = try XCTUnwrap(result.frames.first)
      XCTAssertGreaterThanOrEqual(f.bodiesDetected, 1, "rotation \(r): a person must be detected")
      let nose = point(f, "nose"), root = point(f, "root"), la = point(f, "leftAnkle"), ra = point(f, "rightAnkle")
      let lw = point(f, "leftWrist"), rw = point(f, "rightWrist")
      for p in [nose, root, la, ra, lw, rw] { XCTAssertGreaterThan(p.c, 0.1, "rotation \(r)") }
      XCTAssertLessThan(nose.y, root.y, "rotation \(r): head above hips in the upright image")
      XCTAssertLessThan(root.y, max(la.y, ra.y), "rotation \(r): hips above ankles")
      XCTAssertGreaterThan(abs(lw.x - rw.x), 0.4, "rotation \(r): arms are spread wide in this photo")
      if let ref = reference {
        for name in ["nose", "neck", "root", "leftWrist", "rightWrist", "leftAnkle", "rightAnkle"] {
          let a = point(ref, name), b = point(f, name)
          guard a.c > 0.3 && b.c > 0.3 else { continue }
          XCTAssertEqual(a.x, b.x, accuracy: 0.04, "rotation \(r) \(name).x")
          XCTAssertEqual(a.y, b.y, accuracy: 0.04, "rotation \(r) \(name).y")
        }
      } else {
        reference = f
        print("GOLFVISION reference frame (rotation 0):", PoseJoints.names.enumerated().map { "\($1)=(\(f.points[$0 * 3]),\(f.points[$0 * 3 + 1]),c\(f.points[$0 * 3 + 2]))" }.joined(separator: " "))
      }
    }
  }
}
