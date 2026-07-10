# Packaging, Tooling & CI Improvement Plan

Plan created 2026-07-08 from the project audit (area grade at time of writing: B-).
Goal: deterministic builds, mechanically verified packaging, lint coverage, and CI-driven publishing.

## Phase 1 — Make the build pipeline deterministic ✅ DONE (2026-07-08)

The `no-styles` generation ran as npm lifecycle hooks around `prepare`, which fired on
every `pnpm install`, regex-mutated `src/lib`, and cleaned up afterward — while
`pnpm run package` (what release-it calls in `after:bump`) did *not* run those hooks,
so two build paths produced different `dist` contents. One transient failure observed.

- [x] Consolidate to a single build entrypoint: `scripts/build-package.ts` generates
      `src/lib/no-styles`, runs `svelte-package`, and cleans up in a `try/finally` so a
      mid-failure cannot leave generated files behind. `prepare` reduced to
      `svelte-kit sync`; `preprepare`/`postprepare` removed, so plain installs no longer
      rebuild the package or mutate source.
- [x] Replace the regex style-stripping (`find-in-files` with a lookahead regex that also
      dropped anything after `</style>`) with `svelte/compiler` `parse()`: slice out the
      `css` span, keep everything else. Relative value imports are rewritten to `../`
      unless they point at a sibling that also has a no-styles copy — this also fixes the
      previously broken `./types` import in the generated Select. `find-in-files`
      dependency and the dead `./get-items` rewrite dropped; `src/remove-styles.ts` and
      `src/post-prepare.ts` deleted.
- [x] Root-cause the transient exit-2: eliminated by construction (no more pre/post hook
      chain); verified with repeated runs.
- [x] Bonus (fell out of dropping `find-in-files`): rewrote
      `docs/generate_theming_variables_md.cjs` with plain fs recursion and included `.css`
      in its scan — the theming doc previously listed only 8 variables because the
      generator ignored `styles/default.css`; it now documents 107.

Acceptance (verified): `pnpm install` no longer touches `src/lib` or `dist`;
`pnpm run package` run twice produces byte-identical `dist` including `no-styles/`
with `.d.ts` files; exports subpaths still resolve; tests and svelte-check green.

## Phase 2 — Packaging correctness, verified mechanically ✅ DONE (2026-07-08)

- [x] Drop the `tailwindcss` peer dependency (stylesheet is processed by the consumer's
      build — no dependency needed). README experimental-styles section documents the
      Tailwind v4 requirement instead.
- [x] Add correctness fields: `sideEffects: ["**/*.css"]`, `engines: { "node": ">=20.19" }`,
      `"./package.json": "./package.json"` in exports; `repository` converted to object
      form (publint warning).
- [x] Add `publint` (`pnpm run lint:package`) and a tarball smoke test
      (`pnpm run smoke` → `scripts/smoke-test.sh`): packs the library, installs the
      tarball into a throwaway Vite+Svelte app, builds a page importing `{ Select }` and
      the `no-styles` subpath, and resolution-checks the css subpaths. (`tailwind.css` is
      resolution-checked rather than built, since building it would require a full
      Tailwind v4 setup in the smoke app.) Both are wired into release-it as a
      `before:npm:release` gate.
- [x] Automate the CHANGELOG with `@release-it/conventional-changelog`
      (conventionalcommits preset, prepends to CHANGELOG.md); validated with a release-it
      dry run. Also fixed the unfinished 1.0.0-beta fork-attribution stub.

Acceptance (verified): `publint` passes with zero warnings ("All good!"); the smoke app
builds against the packed tarball (136 modules, both Select variants).

## Phase 3 — Lint ✅ DONE (2026-07-10)

- [x] ESLint 9 flat config (`eslint.config.js`) with `eslint-plugin-svelte` +
      `typescript-eslint` + `eslint-config-prettier`; `"lint": "eslint ."` and
      `"format:check": "prettier --check ."` scripts added.
- [x] Cleanup pass (204 initial errors): removed dead code lint flagged — unused params
      (`_`-prefixed where the signature is API), leftover `$inspect` debug calls in two
      example pages, unused consts in tests, `prefer-const` autofixes, and a
      `no-prototype-builtins` fix in `utils.ts`. The inert `getFilteredItems` prop
      (destructured but never read — upstream's Svelte 4 `export const` accessor lost in
      the port) was restored as a real instance export callable via `bind:this`; README
      updated. `isCancelled` was NOT removed: it is an exported public symbol, which
      ESLint cannot flag as unused — dropping it is an API decision, left for a future
      major.
- [x] Deliberate rule policy: `no-explicit-any` off (items are consumer-defined shapes),
      `no-unused-expressions` off in Svelte files (bare signal reads are the
      tracked-trigger idiom used with `untrack()`), `require-each-key` off (consumer
      items carry no guaranteed unique key; unkeyed each is upstream behavior),
      `no-navigation-without-resolve` off for the demo routes.
- [x] Bonus: `.prettierrc` never declared `plugins: ["prettier-plugin-svelte"]`, so
      Prettier 3 had been silently skipping every `.svelte` file and warning on two
      removed options. Fixed the config, extended `.prettierignore` to generated
      output, and ran the one-time repo reformat (84 files) so `format:check` is
      meaningful.

Acceptance (verified): `pnpm run lint` clean; an intentionally introduced unused variable
is flagged by `@typescript-eslint/no-unused-vars`; `format:check` passes; tests
(277 passed / 3 skipped) and svelte-check (0 errors) green after the cleanup.

## Phase 4 — CI/CD ✅ DONE (2026-07-10) — one owner action pending

- [x] Extended `ci.yml`: test/check now run on a Node 20/22 matrix; added a `lint` job
      (`lint` + `format:check`) and a `package` job (`pnpm run package` + `publint` +
      tarball smoke test).
- [x] Publishing moved into CI: `.github/workflows/publish.yml` triggers on `v*` tags,
      verifies the tag matches `package.json`, reruns check + tests + package + publint +
      smoke against the tagged commit, then `npm publish --provenance` via trusted
      publishing (OIDC; `id-token: write`, npm upgraded to >=11.5.1 in the job).
      `workflow_dispatch` runs the same gate with `npm publish --dry-run` — use this for
      the dress rehearsal. release-it keeps version-bump/tag/GitHub-release locally:
      `npm.publish` set to `false`, and the publint+smoke gate moved from
      `before:npm:release` (which no longer fires) to `before:git:release` so it still
      gates tag creation.
- [x] Dependabot added for `github-actions` (grouped) and npm (weekly, grouped
      minor/patch).

Acceptance: workflows + config in place and verified locally (publint "All good!",
smoke test passed, lint/format/tests/check green). ⚠️ Before the first tagged release:
enable trusted publishing for `svelte-5-select` on npmjs.com pointing at
`.github/workflows/publish.yml` (owner action, ~2 minutes), then dress-rehearse via the
workflow's manual dispatch. Full acceptance — a `v*` tag publishing with provenance —
is verifiable only after that.

## Deliberate omissions

- No husky/pre-commit hooks: CI covers the same ground; hooks slow the inner loop for no
  marginal safety.
- No re-architecture of the `no-styles` build-time codegen approach itself — upstream's
  design, not worth replacing now.
