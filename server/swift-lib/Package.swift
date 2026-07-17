// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "calendar-lib",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "calendar-lib", type: .static, targets: ["calendar-lib"])
    ],
    dependencies: [
        .package(url: "https://github.com/Brendonovich/swift-rs", from: "1.0.6")
    ],
    targets: [
        .target(
            name: "calendar-lib",
            dependencies: [.product(name: "SwiftRs", package: "swift-rs")],
            path: "Sources/calendar-lib",
            linkerSettings: [.linkedFramework("EventKit")]
        )
    ]
)
