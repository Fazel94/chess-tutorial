#!/usr/bin/env bash
# Export a license-clean snapshot of HEAD into a sibling public mirror repo.
#
# The private repo (gitea) keeps full history; the public GitHub mirror gets a
# single squashed commit per sync with protected/internal files stripped out.
# Idempotent — rerun any time to resync the mirror to one commit per sync.
#
# Usage:  ./tools/github-mirror.sh [DEST]   (default: ../chess-tutorial-public)

set -euo pipefail

SRC="$(git rev-parse --show-toplevel)"
DEST="${1:-$SRC/../chess-tutorial-public}"
SHA="$(git -C "$SRC" rev-parse --short HEAD)"

# pgns/        — protected Chessable exports (English commentary, licensed)
# .omp/        — agent memory
# gitea-push-setup.md / example.env — internal infra docs/credentials
# fen.txt      — scratch
EXCLUDE=(pgns .omp docs/gitea-push-setup.md example.env fen.txt)

mkdir -p "$DEST"
[ -d "$DEST/.git" ] || git -C "$DEST" init -b main

# wipe everything except .git, then unpack a fresh snapshot of HEAD
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
git -C "$SRC" archive HEAD | tar -x -C "$DEST"
for p in "${EXCLUDE[@]}"; do rm -rf "$DEST/$p"; done

# belt-and-braces: never re-add the protected exports
printf 'pgns/\n' >> "$DEST/.gitignore"

git -C "$DEST" add -A
git -C "$DEST" commit -m "Sync from private repo @${SHA}" || echo "nothing to sync"
