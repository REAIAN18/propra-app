#!/usr/bin/env bash
# safe-npm.sh — Serializes npm operations to prevent race conditions from concurrent agents.
# Usage: ./scripts/safe-npm.sh install <package>
#        ./scripts/safe-npm.sh install
#        ./scripts/safe-npm.sh ci

set -e

LOCKDIR="/tmp/propra-npm-lock"
PIDFILE="$LOCKDIR/pid"
TIMEOUT=120   # max seconds to wait for lock
WAITED=0

while ! mkdir "$LOCKDIR" 2>/dev/null; do
  if [ "$WAITED" -ge "$TIMEOUT" ]; then
    echo "[safe-npm] ERROR: Could not acquire lock after ${TIMEOUT}s. Another process may be stuck." >&2
    exit 1
  fi
  HOLDER=$(cat "$PIDFILE" 2>/dev/null || echo "unknown")
  echo "[safe-npm] Waiting for npm lock (held by PID $HOLDER)... ${WAITED}s"
  sleep 2
  WAITED=$((WAITED + 2))
done

echo $$ > "$PIDFILE"
trap 'rm -rf "$LOCKDIR"' EXIT INT TERM

echo "[safe-npm] Lock acquired (PID $$). Running: npm $*"
npm "$@"
