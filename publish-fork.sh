#!/usr/bin/env bash
# Temporarily publish packages/ai/amazon-bedrock to GitHub Packages as
# @wmaurer/ai-amazon-bedrock.
#
#   ./publish-fork.sh              # dry run (packs a tarball, publishes nothing)
#   ./publish-fork.sh --publish    # actually publishes
#
# Everything happens in a throwaway git worktree, so your working tree is never
# touched -- the release build steps (codemod, strip-internal) rewrite tracked
# files in place, which is only safe on a disposable checkout.
#
# Requires ~/.npmrc:  //npm.pkg.github.com/:_authToken=<PAT with write:packages>
set -euo pipefail

SUFFIX="${SUFFIX:-wmaurer.0}"          # bump for every republish; versions are never reusable
FAITHFUL="${FAITHFUL:-0}"              # 1 = also run codemod + strip-internal like the release pipeline
PKG_DIR="packages/ai/amazon-bedrock"
REGISTRY="https://npm.pkg.github.com"

cd "$(git rev-parse --show-toplevel)"
[ -f "$PKG_DIR/package.json" ] || { echo "run from the effect worktree" >&2; exit 1; }

BASE_VERSION="$(node -p "require('./$PKG_DIR/package.json').version")"
NEW_VERSION="$BASE_VERSION-$SUFFIX"
STAGE="$(mktemp -d)/publish"

cleanup() { git worktree remove --force "$STAGE" 2>/dev/null || true; }
trap cleanup EXIT

echo "==> staging a clean checkout of HEAD at $STAGE"
git worktree add -q --detach "$STAGE" HEAD
cd "$STAGE"

node -e '
  const fs = require("fs");
  const p = "'"$PKG_DIR"'/package.json";
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.name = "@wmaurer/ai-amazon-bedrock";
  j.version = "'"$NEW_VERSION"'";
  j.repository = { type: "git", url: "https://github.com/wmaurer/effect.git", directory: "'"$PKG_DIR"'" };
  j.bugs = { url: "https://github.com/wmaurer/effect/issues" };
  delete j.publishConfig.provenance;   // needs OIDC from GitHub Actions; fails locally
  j.publishConfig.registry = "'"$REGISTRY"'";
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
'

echo "==> installing"
pnpm install --frozen-lockfile

if [ "$FAITHFUL" = "1" ]; then
  echo "==> strip-internal + codemod (release-faithful)"
  node scripts/set-strip-internal.mjs
  pnpm codemod
fi

echo "==> building"
pnpm build

cd "$PKG_DIR"
echo "==> @wmaurer/ai-amazon-bedrock@$NEW_VERSION"
if [ "${1:-}" = "--publish" ]; then
  pnpm publish --registry "$REGISTRY" --no-git-checks --access public
  echo "published. consumers need an .npmrc with:"
  echo "  @wmaurer:registry=$REGISTRY"
  echo "  //npm.pkg.github.com/:_authToken=<PAT with read:packages>"
else
  pnpm pack --pack-destination /tmp
  echo
  echo "DRY RUN - nothing published. Inspect the tarball, then re-run with --publish."
fi
