#!/usr/bin/env bash
# Render all 48 month explainer videos (4 studios × 12 months), two at a time.
# Usage: ./scripts/render-all.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="${PY:-python3}"
FFMPEG="${FFMPEG:-$ROOT/.ffmpeg-build/bin/ffmpeg}"

if ! command -v "$FFMPEG" >/dev/null 2>&1; then
  echo "ffmpeg not found at $FFMPEG" >&2
  exit 1
fi

studios=(bandra kemps-corner kenkere-house pop-up)
months=(01 02 03 04 05 06 07 08 09 10 11 12)

jobs=()
for studio in "${studios[@]}"; do
  for mm in "${months[@]}"; do
    slug="${studio}-${mm}"
    if [ ! -f "$ROOT/public/explainer/audio/${slug}-a.mp3" ] || [ ! -f "$ROOT/public/explainer/audio/${slug}-b.mp3" ]; then
      echo "skip $slug: audio missing"
      continue
    fi
    $PY "$ROOT/scripts/render-video.py" "$studio" "$mm" &
    jobs+=($!)
    if [ "${#jobs[@]}" -ge 2 ]; then
      wait -n || true
      jobs=($(jobs -p))
    fi
  done
done
wait

echo "all renders done; rebuilding manifest"
$PY "$ROOT/scripts/render-video.py" --manifest
