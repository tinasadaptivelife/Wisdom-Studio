#!/bin/zsh
# Stop Wisdom Studio (whatever is listening on its port).
set -uo pipefail
PORT="${WISDOM_STUDIO_PORT:-4000}"
pids=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null)
if [[ -z "$pids" ]]; then
  echo "Wisdom Studio is not running."
  exit 0
fi
echo "$pids" | xargs kill
for _ in {1..10}; do
  sleep 0.5
  [[ -z "$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null)" ]] && { echo "Wisdom Studio stopped."; exit 0; }
done
echo "$pids" | xargs kill -9
echo "Wisdom Studio stopped."
