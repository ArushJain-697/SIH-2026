#!/usr/bin/env bash
# Fetches the target's public source for STATIC analysis only (the
# Seam-Linter, framework/generate-proof-spine.mjs). This is reading public
# source, not testing a running instance — explicitly permitted by
# docs/ROE.md. Never used to stand up a live deployment with real credentials.
#
# Output: .cache/worldmonitor-src/ (gitignored — ~200MB, never committed).
#
# Usage: bash lab/fetch-target-source.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/.cache/worldmonitor-src"
REPO_URL="https://github.com/koala73/worldmonitor.git"

mkdir -p "$ROOT/.cache"

if [ -d "$DEST/.git" ]; then
  echo "worldmonitor-src already present at $DEST — refreshing (git fetch + reset)"
  git -C "$DEST" fetch --depth 1 origin main
  git -C "$DEST" reset --hard origin/main
else
  echo "cloning $REPO_URL (shallow, depth=1) into $DEST"
  git clone --depth 1 "$REPO_URL" "$DEST"
fi

COMMIT=$(git -C "$DEST" rev-parse HEAD)
DATE=$(git -C "$DEST" log -1 --format='%cI')
echo
echo "pinned commit: $COMMIT"
echo "commit date:   $DATE"
echo
echo "Record this commit in docs/ground-truth.md / lab/README.md before citing"
echo "any Seam-Linter output — the repo moves daily."
