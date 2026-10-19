#!/bin/sh
# Installs the packaged app to /Applications. Replaces the old copy instead of copying over it
# (leftover files break the app's signature and can stop macOS loading the widget), and
# restarts the app if it was open so the new version is the one running.
set -e
APP="/Applications/Academic Dashboard.app"
running=false
if pgrep -xq "Academic Dashboard"; then
  running=true
  osascript -e 'quit app "Academic Dashboard"'
  for i in $(seq 20); do pgrep -xq "Academic Dashboard" || break; sleep 0.5; done
fi
rm -rf "$APP"
ditto "release/mac-arm64/Academic Dashboard.app" "$APP"
codesign --verify --deep --strict "$APP"
if $running; then open -a "Academic Dashboard"; fi
