#!/bin/bash
#
# Vercel ignoreCommand — exit 0 to SKIP build, exit 1 to PROCEED.
#
# Skips deploys when:
#   1. The latest commit message contains "[skip-deploy]"
#   2. The push only touches paths that don't affect the running app
#      (docs, markdown, github metadata, .vscode, etc.)
#
# Vercel runs this from the repo root with the latest commit checked out.

set -u

MSG="$(git log -1 --pretty=%B 2>/dev/null || echo '')"

# Explicit opt-out
if echo "$MSG" | grep -qE '\[skip-deploy\]|\[skip-vercel\]|\[no-deploy\]'; then
  echo "Skipping deploy: commit message contains skip marker"
  exit 0
fi

# Compare against the previous commit (Vercel sets VERCEL_GIT_PREVIOUS_SHA on
# subsequent builds; on the first build of a branch it's empty, so we proceed).
PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$PREV" ]; then
  echo "Proceeding: no previous SHA (first build or unknown)"
  exit 1
fi

CHANGED="$(git diff --name-only "$PREV" HEAD 2>/dev/null || echo '')"
if [ -z "$CHANGED" ]; then
  echo "Proceeding: could not compute changed files"
  exit 1
fi

# Files that don't affect the running app
APP_AFFECTING="$(echo "$CHANGED" | grep -vE '^(\.github/|docs/|README\.md|CHANGELOG\.md|\.vscode/|\.idea/|memory/|\.gitignore|LICENSE)' || true)"

if [ -z "$APP_AFFECTING" ]; then
  echo "Skipping deploy: only docs/metadata changed"
  echo "Changed files:"
  echo "$CHANGED" | sed 's/^/  /'
  exit 0
fi

echo "Proceeding: app-affecting changes detected"
exit 1
