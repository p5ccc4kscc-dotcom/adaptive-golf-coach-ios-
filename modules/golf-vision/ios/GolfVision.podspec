Pod::Spec.new do |s|
  s.name           = 'GolfVision'
  s.version        = '0.1.0'
  s.summary        = 'BadGolfer on-device swing video analysis (AVFoundation + Apple Vision 2D body pose)'
  s.description    = 'Reads swing-video metadata and exact frames, and runs Apple Vision body-pose detection on the device.'
  s.author         = 'BadGolfer'
  s.homepage       = 'https://github.com/p5ccc4kscc-dotcom/adaptive-golf-coach-ios-'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'Vision', 'CoreMedia', 'CoreVideo', 'ImageIO', 'UniformTypeIdentifiers'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  # Only the module and the platform-independent core; Package.swift and Tests/ are for `swift test` on macOS.
  s.source_files = 'GolfVisionModule.swift', 'Core/**/*.swift'
end
