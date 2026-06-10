#!/usr/bin/env bash
# Deploy course/site/ to S3 via s3cmd (already configured in ~/.s3cfg).
#
# Forces a clean rebuild, duplicates 404.html as error.html (website error document),
# then syncs in cache-aware passes followed by a --delete-removed sweep.
#
# Usage:  make deploy   (or)   ./tools/deploy.sh
#

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# --- Configuration -----------------------------------------------------------
BUCKET="fazelblog"
SITE="https://chess.nlogn.ir"

# --- Tooling check -----------------------------------------------------------
if ! command -v s3cmd >/dev/null 2>&1; then
  cat >&2 <<'EOF'
ERROR: s3cmd not found. Install with one of:
  apt install s3cmd
  brew install s3cmd
  pip install s3cmd
EOF
  exit 1
fi

echo "==> Bucket:    $BUCKET"
echo "==> Site:      $SITE"

# --- Build ------------------------------------------------------------------
echo "==> Building site (make clean build)…"
make clean build

# S3 requires error.html. MkDocs writes 404.html;
# duplicate it so both resolve (/404.html and the website error document).
cp course/site/404.html course/site/error.html

# --- Ensure static-website config (idempotent) ------------------------------
echo "==> Ensuring bucket website config…"
s3cmd ws-create --ws-index=index.html --ws-error=error.html "s3://$BUCKET/" 2>/dev/null || true

SRC="course/site/"
S3="s3://$BUCKET"

SYNC_COMMON=(--acl-public --no-mime-magic --guess-mime-type)

# --- Pass A: hashed long-life assets (1 year, immutable) --------------------
# Material's JS/CSS bundles and fonts carry content hashes in their filenames.
# Stockfish WASM is a stable release artifact.
echo "==> Pass A: long-cache assets (1y immutable)…"
s3cmd sync "$SRC" "$S3/" "${SYNC_COMMON[@]}" \
  --add-header='Cache-Control: public, max-age=31536000, immutable' \
  --exclude "*" \
  --include "assets/javascripts/*" \
  --include "assets/stylesheets/*" \
  --include "assets/fonts/*" \
  --include "*.woff2" \
  --include "*.woff" \
  --include "assets/stockfish/*"

# --- Pass B: medium cache (widgets bundle, sounds, sitemap) -----------------
# widgets.{js,css} are rebuilt every deploy but filenames are not hashed,
# so keep cache short (1 hour). Sounds and sitemap: 1 hour.
echo "==> Pass B: medium-cache assets (1h)…"
s3cmd sync "$SRC" "$S3/" "${SYNC_COMMON[@]}" \
  --add-header='Cache-Control: public, max-age=3600' \
  --exclude "*" \
  --include "assets/widgets.js" \
  --include "assets/widgets.css" \
  --include "assets/sounds/*" \
  --include "sitemap.xml" \
  --include "sitemap.xml.gz" \
  --include "robots.txt"

# --- Pass C: HTML, no-cache -------------------------------------------------
# Until a CDN cache-purge step is wired in, no-cache is the safe default.
# See plan TODO: switch to max-age=3600 once purge is automated.
echo "==> Pass C: HTML (no-cache)…"
s3cmd sync "$SRC" "$S3/" "${SYNC_COMMON[@]}" \
  --add-header='Cache-Control: no-cache, must-revalidate' \
  --add-header='Content-Type: text/html; charset=utf-8' \
  --exclude "*" \
  --include "*.html"

# --- Pass D: catch-all + delete sweep --------------------------------------
# Uploads anything not matched above (images, misc) with a short cache,
# and removes objects that no longer exist in the built site.
echo "==> Pass D: remaining objects + prune deleted…"
s3cmd sync "$SRC" "$S3/" "${SYNC_COMMON[@]}" \
  --add-header='Cache-Control: public, max-age=300' \
  --delete-removed

# --- Smoke test -------------------------------------------------------------
echo "==> Smoke test: $SITE"
if curl -fsI "$SITE/" >/dev/null 2>&1; then
  echo "    OK: index.html reachable"
else
  echo "    WARN: not reachable yet — propagation may take a moment."
fi
echo ""
echo "==> Done. Visit: $SITE/"
