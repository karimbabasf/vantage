#!/usr/bin/env bash
# Builds Vantage.app: the frontend, the server binary, and a minimal bundle around
# them. The bundle exists for one reason: macOS will not grant Calendar or Mail
# access (TCC) to a loose binary, it needs a bundle identity and a signature.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
APP="$ROOT/build/Vantage.app"

echo "==> frontend"
pnpm build

echo "==> server (release)"
cargo build --release --manifest-path server/Cargo.toml

echo "==> bundle"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp server/target/release/vantage "$APP/Contents/MacOS/vantage"
cp server/Info.plist             "$APP/Contents/Info.plist"
cp server/icons/icon.icns        "$APP/Contents/Resources/icon.icns"
cp -R dist                       "$APP/Contents/Resources/dist"

# Ad-hoc signature. TCC keys the grant to this identity, so the grant is dropped
# every time the signature changes (i.e. every rebuild). A Developer ID cert would
# make it stable; for a single local install this is fine.
echo "==> sign (ad-hoc)"
codesign --force --deep --sign - "$APP"
codesign --verify --verbose=1 "$APP" 2>&1 | sed 's/^/    /'

echo
echo "    built $APP"
echo "    run:  open $APP     (then http://127.0.0.1:7777)"
echo "    stop: pkill -f Vantage.app/Contents/MacOS/vantage"
