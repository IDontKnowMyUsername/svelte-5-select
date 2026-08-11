#!/usr/bin/env sh
# One-time sandbox setup (results persist in the compose volumes):
#   docker compose run --rm sandbox sh docker/setup.sh
set -e
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
