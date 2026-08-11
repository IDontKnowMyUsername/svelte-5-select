# Claude Code sandbox for svelte-5-select.
# Build/run via docker-compose.yml at the repo root — the repo is bind-mounted
# at /workspace, so this image only carries the toolchain, never the source.
FROM node:22-bookworm

# System libraries Playwright's Chromium needs (the browser binary itself is
# installed lockfile-matched by docker/setup.sh into the node user's cache).
# Version here only selects the deps list; keep it in step with the
# playwright devDependency's major.minor.
RUN npx -y playwright@1.61.1 install-deps chromium && rm -rf /root/.npm

# Claude Code CLI + corepack shims (pnpm version comes from package.json's
# "packageManager" field at run time).
RUN npm install -g @anthropic-ai/claude-code && corepack enable

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV CLAUDE_CONFIG_DIR=/home/node/.claude

# Pre-create the named-volume mount points node-owned, so fresh volumes
# inherit that ownership instead of defaulting to root.
RUN mkdir -p /workspace/node_modules /home/node/.cache /home/node/.claude \
    && chown -R node:node /workspace /home/node

USER node
WORKDIR /workspace
CMD ["bash"]
