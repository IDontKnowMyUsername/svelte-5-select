# Build / CI ergonomics backlog

Maintainer-facing list of the known build, packaging, and CI polish items. Source:
the 12th audit (2026-07-17), which graded Build/CI **A** with a **GO** verdict for
the first tagged release — nothing here blocks releasing or affects the
correctness of the publish flow. Items are ordered roughly by value.

## Open items

### 1. Action pins are majors behind current

`.github/workflows/ci.yml` and `publish.yml` pin actions by SHA (good), but three
of the five are old majors:

| Action                | Pinned  | Latest |
| --------------------- | ------- | ------ |
| `actions/checkout`    | v4.3.1  | v7     |
| `actions/setup-node`  | v4.4.0  | v7     |
| `pnpm/action-setup`   | v4/v5   | v6     |

(`upload-artifact` v7 and `download-artifact` v8 are current; all five SHAs
verifiably match their version comments.)

**Risk:** GitHub eventually retires the older action runtimes, and the
release-critical publish workflow breaks at tag time.
**Fix:** bump the three pins deliberately (new SHA + comment), one PR, watch CI.

### 2. `CHANGELOG.md` is not in the published tarball

`package.json` has `"files": ["dist"]`; npm auto-includes only
README/LICENSE/package.json. For a project whose changelog is a hand-written,
double-gated artifact, consumers get no offline copy.
**Fix:** add `"CHANGELOG.md"` to `files`.

### 3. No `requireBranch` in `.release-it.json`

A release run from a side or stale branch creates the version commit, the tag,
and the GitHub release before CI's tag-ancestry gate refuses to publish —
recovery is manual tag/release cleanup.
**Fix:** add `"git": { "requireBranch": "master" }` (one line).

### 4. No `concurrency` groups or `timeout-minutes` in workflows

Rapid pushes stack redundant CI runs, and a hung playwright step in the publish
gate job would burn the 360-minute default on the release path.
**Fix:** a `concurrency: { group: ..., cancel-in-progress: true }` block in
`ci.yml`, plus `timeout-minutes` on every job in both workflows (~15 for CI
jobs, ~30 for the publish gate).

### 5. Playwright chromium re-downloads every run

The pnpm store is cached; the browser binaries are not, so every browser-suite
job re-downloads chromium.
**Fix:** cache `~/.cache/ms-playwright` keyed on the playwright version.

### 6. Cosmetics

- **"Exact bytes" comment in `publish.yml` (~line 86) is not literally true**:
  `pnpm pack` re-runs `prepack` → `pnpm run package`, so the uploaded tarball is
  a post-validation rebuild (byte-identical in practice — the build is
  deterministic). The real security property — the privileged job runs zero
  build code — still holds. Either pack once and validate that artifact, or
  reword the comment.
- **Ancestry-gate failure message prints the wrong SHA for annotated tags**:
  `$GITHUB_SHA` (publish.yml ~line 48) is the tag-object SHA, not the commit,
  for release-it's default annotated tags. The gate itself is correct
  (`git merge-base --is-ancestor` peels tag objects); only the diagnostic
  message misleads.
- **`/docs` is gitignored while containing tracked files**: this file and the
  theming-variables generator/output are force-added (`git add -f`); any new
  file here is silently un-committable without `-f`. Either narrow the ignore
  (it predates the tracked docs) or keep force-adding knowingly.
- **The smoke gate installs floating deps from the live registry**
  (`scripts/smoke-test.sh`: `vite ^8`, plugin `^7`, `svelte ^5.55`): a broken
  upstream release can fail — or mask — the release gate independent of repo
  state. This is a deliberate freshness trade-off; noted so a mysterious gate
  failure gets checked against upstream first.

## Deliberate holds — not backlog, do not "fix"

- `npm@11.18.0` exact pin in the publish job (latest is 12.x): stay on the
  mature line for the publish-critical path.
- Held-back dev dependencies: typescript 7, pnpm major, prettier family,
  release-it 20 — see the dependency-holds note in project memory / `ncu`
  output is expected to show these.
- `npm publish --dry-run` in the manual-dispatch rehearsal never contacts the
  registry: the OIDC exchange itself is first exercised by the first real tag.
  That is a npm limitation, not a workflow gap.
