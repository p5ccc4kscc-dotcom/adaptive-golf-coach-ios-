// swift-tools-version:5.9
// Builds and tests the platform-independent analysis core on macOS (`swift test`), using the real
// AVFoundation and Apple Vision frameworks. The iOS app compiles the same Core sources through the
// CocoaPods spec instead; this package is not used by the app.
import PackageDescription

let package = Package(
  name: "GolfVisionCore",
  platforms: [.macOS(.v13), .iOS(.v16)],
  products: [.library(name: "GolfVisionCore", targets: ["GolfVisionCore"])],
  targets: [
    .target(name: "GolfVisionCore", path: "Core"),
    .testTarget(name: "GolfVisionCoreTests", dependencies: ["GolfVisionCore"], path: "Tests/GolfVisionCoreTests"),
  ]
)
