#!/bin/zsh
# Safely stop the Wisdom Studio backend + frontend dev servers.
set -uo pipefail

BACKEND_PORT=4000
FRONTEND_PORT=5173

stop_port() {
  local name="$1" port="$2"
  local pids
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null)
  if [[ -z "$pids" ]]; then
    echo "$name: not running (port $port free)"
    return
  fi

  echo "$name: stopping pid(s) $(echo $pids | xargs) on port $port (SIGTERM)"
  echo "$pids" | xargs kill

  for i in {1..10}; do
    sleep 0.5
    pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null)
    [[ -z "$pids" ]] && break
  done

  if [[ -n "$pids" ]]; then
    echo "$name: still up after 5s, sending SIGKILL"
    echo "$pids" | xargs kill -9
  fi

  echo "$name: stopped"
}

echo "== Wisdom Studio: shutdown =="
stop_port "Backend" "$BACKEND_PORT"
stop_port "Frontend" "$FRONTEND_PORT"
