use std::path::PathBuf;
use swift_rs::SwiftLinker;

fn main() {
    // Compile and link the in-process Swift EventKit bridge (swift-lib package).
    SwiftLinker::new("14.0")
        .with_package("calendar-lib", "swift-lib")
        .link();

    // Frameworks the Swift bridge depends on.
    println!("cargo:rustc-link-lib=framework=EventKit");
    println!("cargo:rustc-link-lib=framework=Foundation");

    // TCC reads the usage descriptions out of the __info_plist section. A .app got
    // these from its bundle; a bare binary has no bundle, so embed them directly or
    // macOS kills the process instead of prompting for Calendar / Mail.
    let manifest = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let plist = manifest.join("Info.plist");
    println!("cargo:rerun-if-changed=Info.plist");
    println!(
        "cargo:rustc-link-arg-bins=-Wl,-sectcreate,__TEXT,__info_plist,{}",
        plist.display()
    );
}
