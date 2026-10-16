#!/bin/zsh
# Start Wisdom Studio (server + built app on one port) and open it in the browser.
# Safe to run again: if it is already running, it just opens the browser.
set -uo pipefail

ROOT="${0:A:h:h}"
PORT="${WISDOM_STUDIO_PORT:-4000}"
URL="http://localhost:$PORT"
LOG="$HOME/Library/Logs/Wisdom Studio.log"
mkdir -p "${LOG:h}"

alert() {
  echo "$1" >&2
  osascript -e "display alert \"Wisdom Studio\" message \"$1\"" >/dev/null 2>&1
}
healthy() { curl -fs -o /dev/null "$URL/api/health" 2>/dev/null; }
open_browser() { [[ -n "${WISDOM_STUDIO_NO_OPEN:-}" ]] || open "$URL"; }

if healthy; then
  open_browser
  exit 0
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  alert "Port $PORT is already in use by another program, so Wisdom Studio can't start. Quit that program and try again."
  exit 1
fi

# Apps started from Finder don't get your shell's PATH, so ask a login shell.
NODE="$(/bin/zsh -lc 'command -v node' 2>/dev/null)"
if [[ ! -x "$NODE" ]]; then
  alert "Node.js was not found. Install Node 22 or newer from nodejs.org, then try again."
  exit 1
fi

# Build the app the first time, and again whenever its source has changed.
DIST="$ROOT/frontend/dist/index.html"
if [[ ! -f "$DIST" || -n "$(find "$ROOT/frontend/src" "$ROOT/frontend/index.html" -newer "$DIST" -print -quit 2>/dev/null)" ]]; then
  echo "== building the app ==" >> "$LOG"
  if ! /bin/zsh -lc "cd '$ROOT/frontend' && npm run build" >> "$LOG" 2>&1; then
    alert "Wisdom Studio could not build its screens. Details are in $LOG"
    exit 1
  fi
fi

(cd "$ROOT/backend" && PORT="$PORT" nohup "$NODE" server.js >> "$LOG" 2>&1 &)

for _ in {1..40}; do
  healthy && break
  sleep 0.5
done

if healthy; then
  open_browser
else
  alert "Wisdom Studio did not start. Details are in $LOG"
  exit 1
fi
