#!/bin/zsh
# Start (or restart) the Wisdom Studio backend + frontend dev servers.
set -uo pipefail

ROOT_DIR="${0:A:h}"
BACKEND_PORT=4000
FRONTEND_PORT=5173
BACKEND_LOG=/tmp/wisdom-backend.log
FRONTEND_LOG=/tmp/wisdom-frontend.log

stop_port() {
  local port="$1"
  local pids
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null)
  if [[ -n "$pids" ]]; then
    echo "Stopping existing process on port $port (pid: $(echo $pids | xargs))"
    echo "$pids" | xargs kill
    sleep 1
    pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null)
    if [[ -n "$pids" ]]; then
      echo "$pids" | xargs kill -9
    fi
  fi
}

echo "== Wisdom Studio: start/restart =="

stop_port "$BACKEND_PORT"
stop_port "$FRONTEND_PORT"

echo "Starting backend on :$BACKEND_PORT (log: $BACKEND_LOG)"
(cd "$ROOT_DIR/backend" && nohup npm run dev > "$BACKEND_LOG" 2>&1 &)

echo "Starting frontend on :$FRONTEND_PORT (log: $FRONTEND_LOG)"
(cd "$ROOT_DIR/frontend" && nohup npm run dev > "$FRONTEND_LOG" 2>&1 &)

sleep 2

if curl -s -o /dev/null -w '' http://localhost:$BACKEND_PORT/api/health 2>/dev/null; then
  echo "Backend:  http://localhost:$BACKEND_PORT  (ok)"
else
  echo "Backend:  http://localhost:$BACKEND_PORT  (still starting, check $BACKEND_LOG)"
fi

FRONTEND_URL="http://localhost:$FRONTEND_PORT"

frontend_ready=false
for i in {1..20}; do
  if curl -s -o /dev/null "$FRONTEND_URL" 2>/dev/null; then
    frontend_ready=true
    break
  fi
  sleep 0.5
done

if [[ "$frontend_ready" == true ]]; then
  echo "Frontend: $FRONTEND_URL  (ok)"
  if [[ -d "/Applications/Brave Browser.app" ]]; then
    open -a "Brave Browser" "$FRONTEND_URL"
  else
    open "$FRONTEND_URL"
  fi
else
  echo "Frontend: $FRONTEND_URL  ('cat $FRONTEND_LOG' if it doesn't come up)"
fi
