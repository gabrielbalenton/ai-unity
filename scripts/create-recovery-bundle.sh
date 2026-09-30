#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this from inside the UNITY repository." >&2
  exit 1
fi

mkdir -p recovery
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
bundle="recovery/unity-${stamp}.bundle"
checksum="${bundle}.sha256"

git bundle create "$bundle" --all
git bundle verify "$bundle" >/dev/null

if command -v shasum >/dev/null 2>&1; then
  (cd recovery && shasum -a 256 "$(basename "$bundle")" > "$(basename "$checksum")")
elif command -v sha256sum >/dev/null 2>&1; then
  (cd recovery && sha256sum "$(basename "$bundle")" > "$(basename "$checksum")")
else
  echo "No SHA-256 utility found; refusing to create an unverifiable recovery bundle." >&2
  rm -f "$bundle"
  exit 1
fi

echo "Created verified recovery bundle: $bundle"
echo "Checksum: $checksum"
echo "Copy both files to an encrypted location outside the primary GitHub account."
