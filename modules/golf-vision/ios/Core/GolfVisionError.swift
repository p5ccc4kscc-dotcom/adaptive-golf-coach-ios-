import Foundation

/// Errors reported to JavaScript with a stable code. Nothing is retried or hidden.
public enum GolfVisionError: Error, Equatable {
  case fileNotFound(String)
  case noVideoTrack
  case unreadable(String)
  case readerFailed(String)
  case frameExtractionFailed(String)
  case cancelled
  case visionFailed(String)

  public var code: String {
    switch self {
    case .fileNotFound: return "ERR_FILE_NOT_FOUND"
    case .noVideoTrack: return "ERR_NO_VIDEO_TRACK"
    case .unreadable: return "ERR_UNREADABLE_VIDEO"
    case .readerFailed: return "ERR_READER_FAILED"
    case .frameExtractionFailed: return "ERR_FRAME_EXTRACTION"
    case .cancelled: return "ERR_CANCELLED"
    case .visionFailed: return "ERR_VISION_FAILED"
    }
  }

  public var message: String {
    switch self {
    case .fileNotFound(let path): return "Video file not found: \(path)"
    case .noVideoTrack: return "The file has no video track."
    case .unreadable(let why): return "The video could not be read: \(why)"
    case .readerFailed(let why): return "Decoding stopped: \(why)"
    case .frameExtractionFailed(let why): return "The frame could not be extracted: \(why)"
    case .cancelled: return "Analysis was cancelled."
    case .visionFailed(let why): return "Apple Vision failed: \(why)"
    }
  }
}
