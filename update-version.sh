#!/usr/bin/env bash
# update-version.sh — POSIX wrapper for scripts/bump-version.mjs
#
# Usage:
#   ./update-version.sh              (defaults to patch)
#   ./update-version.sh patch        0.1.0 -> 0.1.1
#   ./update-version.sh minor        0.1.0 -> 0.2.0
#   ./update-version.sh major        0.1.0 -> 1.0.0
#   ./update-version.sh 1.2.3        explicit set
#
# Bumps package.json then re-stamps public/sw.js + public/version.json.
# On the next deploy every browser will detect the SW change and force-update.

set -euo pipefail

# Resolve the script's directory so the wrapper works regardless of the
# caller's cwd. Handles symlinks via readlink fallback.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR"

exec node scripts/bump-version.mjs "$@"
