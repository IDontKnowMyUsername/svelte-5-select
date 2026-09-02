#!/usr/bin/env bash
# Prints the npm dist-tag a version should publish under: `next` for any
# prerelease (a version with a hyphen, e.g. 2.2.0-beta.1), `latest` otherwise.
# Used by .github/workflows/publish.yml for both the dry-run and the real publish.
set -euo pipefail
case "${1:?usage: dist-tag.sh <version>}" in
    *-*) echo next ;;
    *) echo latest ;;
esac
