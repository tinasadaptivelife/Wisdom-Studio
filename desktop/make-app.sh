#!/bin/zsh
# Build "Wisdom Studio.app" (and a "Stop Wisdom Studio" command) on your Desktop.
# Usage: desktop/make-app.sh [destination folder]   (default: ~/Desktop)
#
# The app is a thin launcher: it runs desktop/launch.sh from this folder, so
# updating the project updates the app too. Keep this folder where it is.
set -euo pipefail

ROOT="${0:A:h:h}"
DEST="${1:-$HOME/Desktop}"
APP="$DEST/Wisdom Studio.app"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Wisdom Studio</string>
  <key>CFBundleDisplayName</key><string>Wisdom Studio</string>
  <key>CFBundleIdentifier</key><string>local.wisdomstudio.app</string>
  <key>CFBundleExecutable</key><string>wisdom-studio</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/wisdom-studio" <<LAUNCHER
#!/bin/zsh
exec "$ROOT/desktop/launch.sh"
LAUNCHER
chmod +x "$APP/Contents/MacOS/wisdom-studio" "$ROOT/desktop/launch.sh" "$ROOT/desktop/stop.sh"

python3 "$ROOT/desktop/make-icon.py" "$APP/Contents/Resources" || echo "(no icon: the app will use the default one)"

cat > "$DEST/Stop Wisdom Studio.command" <<STOP
#!/bin/zsh
exec "$ROOT/desktop/stop.sh"
STOP
chmod +x "$DEST/Stop Wisdom Studio.command"

touch "$APP"
echo "Made: $APP"
echo "Made: $DEST/Stop Wisdom Studio.command"
