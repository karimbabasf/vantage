# Vantage

A local macOS command board. One screen: your calendar day, the mail that needs you, and your Instagram signal.

Vantage runs as a small HTTP server on your own machine and opens the board in your browser. The Rust side does the native work (EventKit, Mail, Keychain, SQLite); the server binds to loopback only. Nothing leaves the machine except direct calls to Meta's Graph API (your own Instagram stats) and, only if you turn it on, the Anthropic API (mail triage).

## What it does

- **Today**: your Apple Calendar day on a live time rail with a moving now-line. Reads Calendar.app through EventKit, so recurring events expand into the correct occurrences.
- **Needs You**: recent Apple Mail ranked into Needs attention / For your awareness / Low priority, each with a one-line reason (VIP sender, sent to you directly, you meet them today, and so on). A local heuristic does this with zero setup; an optional Claude pass sharpens the reason line.
- **Signal**: Instagram Business or Creator stats. Follower count with 24h and 7d growth (snapshotted locally each poll), reach, likes, comments, and recent posts.

Twitter/X is intentionally left out: as of 2026 it is pay-per-call with no free reads, so there is no clean way to connect it.

## Run it

Requirements: macOS 14+, Node 20+, pnpm, Rust, Xcode Command Line Tools.

```
pnpm install
bash scripts/package.sh     # builds and ad-hoc signs build/Vantage.app
open build/Vantage.app      # serves and opens http://127.0.0.1:7777
```

Stop it with `pkill -f Vantage.app/Contents/MacOS/vantage`.

Use the packaged app for real data. macOS only grants Calendar access to a signed, bundled app, so a loose `cargo run` binary is denied outright and never even prompts.

## One-time setup

1. **Calendar**: click Allow on the prompt at first launch.
2. **Mail**: click OK on the Automation prompt at first launch.
3. **Your addresses**: open Settings and add every address you receive at, one per line. Mail sent to one of these ranks as addressed to you, so an account whose address is missing here is quietly demoted. Settings persist in the browser.
4. **Instagram** (optional): needs a Business or Creator account linked to a Facebook Page.
   - Create a Meta app at developers.facebook.com, then add the Instagram and Facebook Login products.
   - In the Graph API Explorer, grant `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, and generate a token.
   - Exchange it for a long-lived token, then paste it in Settings, Instagram, Connect. The token is stored in the macOS Keychain.
5. **AI mail triage** (optional): Settings, Mail triage, add an Anthropic API key. Off by default; on sends only subjects and short snippets to the Anthropic API.

Rebuilding the app re-signs it ad-hoc, which changes its code signature. macOS drops the Calendar grant when that happens and does not re-prompt, so the board starts reporting Calendar as denied. Recover with:

```
tccutil reset Calendar com.karim.vantage
open build/Vantage.app      # then click Allow
```

A stable signing identity (a self-signed certificate or a Developer ID) makes the grant survive rebuilds.

## Develop and test it

```
pnpm dev        # board on http://localhost:1420, proxies /api to the server on 7777
pnpm server     # cargo run, the API on 7777
pnpm build      # typecheck (tsc) and build the frontend
cargo build --manifest-path server/Cargo.toml
```

`pnpm dev` alone works with no server running: the health probe fails and the board falls back to mock data, so the whole UI is browsable standalone.

## How it is built

- **Frontend** (`src/`): React + TypeScript + Vite + Tailwind v4. A split-flap board UI, anime.js count-ups, and a lazy-loaded react-three-fiber ambient layer. Self-hosted fonts (Cabinet Grotesk, Switzer, Fragment Mono).
- **Server** (`server/`): Rust + axum on 127.0.0.1:7777, serving the built frontend and a small `/api`.
  - Calendar: an in-process Swift EventKit bridge via swift-rs (`swift-lib/`), so the TCC grant attaches to Vantage.app.
  - Mail: AppleScript through `osascript`, bounded to the newest N messages per inbox. Never `whose`, never `every message`, and bodies are never read: each of those costs one Apple Event per message and walks IMAP for minutes.
  - Instagram: the Graph API v25 via reqwest, with local daily snapshots in SQLite for growth deltas.
  - Secrets (tokens, keys) live in the macOS Keychain, never in files.
- Native calls all block, so handlers push them onto `spawn_blocking` rather than stalling the async runtime.

### Why it is safe to run

The server hands out your mail and calendar over HTTP, so any page in any browser could try to read it. Three things close that:

- It binds to loopback only, so it is never reachable from the network.
- Every `/api` request must carry an `x-vantage-client` header. A cross-origin page cannot send it without a preflight the router never answers.
- An Origin allowlist rejects anything that is not a local page.
