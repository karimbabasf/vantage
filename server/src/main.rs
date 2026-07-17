//! Vantage runs as a loopback HTTP server on this Mac. The Rust side keeps doing
//! the native work (EventKit, Mail, Keychain, SQLite); the board is a normal web
//! page served from here and opened in a real browser.

mod ai;
mod calendar;
mod http;
mod instagram;
mod mail;
mod model;
mod secrets;
mod store;

use std::net::{Ipv4Addr, SocketAddr};
use std::path::PathBuf;
use std::process::Command;

const DEFAULT_PORT: u16 = 7777;

/// Built frontend location: explicit override, then Vantage.app/Contents/Resources/dist,
/// then beside the binary, otherwise the repo's dist/ during development.
fn dist_dir() -> PathBuf {
    if let Ok(p) = std::env::var("VANTAGE_DIST") {
        return PathBuf::from(p);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(macos) = exe.parent() {
            for candidate in [macos.join("../Resources/dist"), macos.join("dist")] {
                if candidate.is_dir() {
                    return candidate;
                }
            }
        }
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../dist")
}

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("VANTAGE_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    let dist = dist_dir();
    let serving_ui = dist.join("index.html").is_file();

    // Loopback only. This endpoint exposes mail and calendar; it must never be
    // reachable from the network.
    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("vantage: cannot bind {addr}: {e}");
            eprintln!("         is another copy already running? try VANTAGE_PORT=7778");
            std::process::exit(1);
        }
    };

    println!("  vantage  ·  http://127.0.0.1:{port}");
    if serving_ui {
        println!("           ·  serving {}", dist.display());
    } else {
        println!("           ·  api only (no dist/ built; run `pnpm dev` for the UI)");
    }

    if serving_ui && std::env::var("VANTAGE_NO_OPEN").is_err() {
        let _ = Command::new("open")
            .arg(format!("http://127.0.0.1:{port}"))
            .spawn();
    }

    if let Err(e) = axum::serve(listener, http::router(dist)).await {
        eprintln!("vantage: server stopped: {e}");
        std::process::exit(1);
    }
}
