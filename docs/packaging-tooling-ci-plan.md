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

## Phase 2 — Packaging correctness, verified mechanically

- [ ] Drop the `tailwindcss` peer dependency. `tailwind.css` is a stylesheet processed by
      the consumer's build — no dependency needed. Remove the peer +
      `peerDependenciesMeta`; document the requirement in the README experimental-styles
      section instead.
- [ ] Add correctness fields: `sideEffects: ["**/*.css"]`, `engines: { "node": ">=20.19" }`
      (vite 8 floor), and `"./package.json": "./package.json"` in exports.
- [ ] Add `publint` and a tarball smoke test: `pnpm pack`, install the tarball into a
      throwaway Vite+Svelte app in a temp dir, compile a page importing `{ Select }`,
      the `no-styles` path, and `tailwind.css`. This is the check that would have caught
      the broken subpath exports before v1.0.0.
- [ ] Automate the CHANGELOG with `@release-it/conventional-changelog` (history is already
      conventional-commit shaped; fixes the stub-entry problem going forward).

Acceptance: `publint` passes with zero warnings; the smoke app builds against the packed tarball.

## Phase 3 — Lint

- [ ] ESLint 9 flat config with `eslint-plugin-svelte` + `typescript-eslint` +
      `eslint-config-prettier`. Add `"lint": "eslint ."` and
      `"format:check": "prettier --check ."` scripts. Expect a small initial cleanup pass;
      lint will mechanically flag the dead exports the audit found (`isCancelled`,
      unused params).

Acceptance: `pnpm run lint` clean; the rule set catches an intentionally introduced unused variable.

## Phase 4 — CI/CD

- [ ] Extend `ci.yml`: add lint + `publint` + the tarball smoke test; run test/check on a
      Node 20/22 matrix.
- [ ] Move publishing into CI: keep release-it locally for version-bump/tag/GitHub-release,
      but publish from a tag-triggered workflow using npm trusted publishing (OIDC) with
      `--provenance`. The workflow reruns check + tests + smoke test against the tagged
      commit before publishing. Requires enabling trusted publishing for the package on
      npmjs.com (owner action, ~2 minutes). Dress-rehearse with `--dry-run` in CI first.
- [ ] Add Dependabot for `github-actions` and npm (weekly, grouped minor/patch), replacing
      the manual "bump dependencies" chores.

Acceptance: a `v*` tag on a green commit publishes to npm with provenance, zero local publish steps.

## Deliberate omissions

- No husky/pre-commit hooks: CI covers the same ground; hooks slow the inner loop for no
  marginal safety.
- No re-architecture of the `no-styles` build-time codegen approach itself — upstream's
  design, not worth replacing now.
