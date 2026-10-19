import AVFoundation
import CoreVideo
import Foundation
import ImageIO
@testable import GolfVisionCore

/// TEST DATA ONLY. Builds real H.264 files with AVFoundation so the analysis core can be checked
/// against known frame rates, durations and orientations. Pixels are either a flat colour (no
/// person) or a real photograph supplied by the CI job; no pose data is ever synthesised.
enum TestVideo {
  /// An RGBA image in memory, row 0 at the top.
  struct Raster {
    var width: Int
    var height: Int
    var rgba: [UInt8]

    static func flat(width: Int, height: Int, r: UInt8, g: UInt8, b: UInt8) -> Raster {
      var px = [UInt8](repeating: 255, count: width * height * 4)
      for i in stride(from: 0, to: px.count, by: 4) { px[i] = r; px[i + 1] = g; px[i + 2] = b }
      return Raster(width: width, height: height, rgba: px)
    }

    static func load(path: String, width: Int, height: Int) throws -> Raster {
      guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
            let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { throw GolfVisionError.unreadable("test image") }
      var px = [UInt8](repeating: 0, count: width * height * 4)
      let ctx = CGContext(data: &px, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
                          space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
      ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
      return Raster(width: width, height: height, rgba: px)
    }

    func pixel(_ x: Int, _ y: Int) -> ArraySlice<UInt8> { rgba[(y * width + x) * 4 ..< (y * width + x) * 4 + 4] }

    /// The STORED pixels for an upright (display) image, given the clockwise rotation the track
    /// transform will apply (see `transform(for:storedWidth:storedHeight:)`).
    func stored(forRotation r: Int) -> Raster {
      let sw = r % 180 == 0 ? width : height
      let sh = r % 180 == 0 ? height : width
      var out = [UInt8](repeating: 0, count: sw * sh * 4)
      for y in 0..<sh {
        for x in 0..<sw {
          let (dx, dy): (Int, Int)
          switch r {
          case 90: (dx, dy) = (width - 1 - y, x)
          case 180: (dx, dy) = (width - 1 - x, height - 1 - y)
          case 270: (dx, dy) = (y, height - 1 - x)
          default: (dx, dy) = (x, y)
          }
          let s = (dy * width + dx) * 4
          let d = (y * sw + x) * 4
          out[d] = rgba[s]; out[d + 1] = rgba[s + 1]; out[d + 2] = rgba[s + 2]; out[d + 3] = 255
        }
      }
      return Raster(width: sw, height: sh, rgba: out)
    }
  }

  /// Track transforms as an iPhone writes them (top-left origin, y down).
  static func transform(for r: Int, storedWidth w: Int, storedHeight h: Int) -> CGAffineTransform {
    switch r {
    case 90: return CGAffineTransform(a: 0, b: 1, c: -1, d: 0, tx: CGFloat(h), ty: 0)
    case 180: return CGAffineTransform(a: -1, b: 0, c: 0, d: -1, tx: CGFloat(w), ty: CGFloat(h))
    case 270: return CGAffineTransform(a: 0, b: -1, c: 1, d: 0, tx: 0, ty: CGFloat(w))
    default: return .identity
    }
  }

  static func tempURL(_ name: String) -> URL {
    FileManager.default.temporaryDirectory.appendingPathComponent("golfvision-\(UUID().uuidString)-\(name).mp4")
  }

  /// Writes `frameCount` copies of `stored` at `fps`, with presentation times i / fps exactly.
  static func write(_ stored: Raster, frameCount: Int, fps: Int32, transform: CGAffineTransform, to url: URL) throws {
    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: stored.width,
      AVVideoHeightKey: stored.height,
    ])
    input.transform = transform
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferWidthKey as String: stored.width,
      kCVPixelBufferHeightKey as String: stored.height,
    ])
    writer.add(input)
    guard writer.startWriting() else { throw writer.error ?? GolfVisionError.unreadable("writer") }
    writer.startSession(atSourceTime: .zero)
    let buffer = try pixelBuffer(stored)
    for i in 0..<frameCount {
      while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
      guard adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps)) else {
        throw writer.error ?? GolfVisionError.unreadable("append")
      }
    }
    input.markAsFinished()
    let done = DispatchSemaphore(value: 0)
    writer.finishWriting { done.signal() }
    done.wait()
    if writer.status != .completed { throw writer.error ?? GolfVisionError.unreadable("finish") }
  }

  static func pixelBuffer(_ r: Raster) throws -> CVPixelBuffer {
    var pb: CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault, r.width, r.height, kCVPixelFormatType_32BGRA,
                        [kCVPixelBufferIOSurfacePropertiesKey as String: [:]] as CFDictionary, &pb)
    guard let pb else { throw GolfVisionError.unreadable("pixel buffer") }
    CVPixelBufferLockBaseAddress(pb, [])
    let base = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
    let stride = CVPixelBufferGetBytesPerRow(pb)
    for y in 0..<r.height {
      for x in 0..<r.width {
        let s = (y * r.width + x) * 4
        let d = y * stride + x * 4
        base[d] = r.rgba[s + 2]; base[d + 1] = r.rgba[s + 1]; base[d + 2] = r.rgba[s]; base[d + 3] = 255
      }
    }
    CVPixelBufferUnlockBaseAddress(pb, [])
    return pb
  }
}
