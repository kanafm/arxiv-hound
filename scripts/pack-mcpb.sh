#!/usr/bin/env bash
# Pack the project into a .mcpb bundle for one-click install in Claude Desktop.
# Requires `dist/` to exist. Run `pnpm build` first.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d dist ]; then
  echo "dist/ not found. Run 'pnpm build' first." >&2
  exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
OUTFILE="arxiv-hound-${VERSION}.mcpb"

exec npx -y @anthropic-ai/dxt pack . "$OUTFILE"
