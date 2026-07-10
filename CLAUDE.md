# Svelte 5 Select Component

A `<Select>` component for Svelte 5 apps.

## Commands

- `npm test` — run vitest in watch mode
- `npm run test:run` — run vitest once
- `npm run check` — type-check with svelte-check
- `npm run dev` — start dev server
- `npm run build` — build the app
- `npm run build:lib` — build the library
- `npm run package` — build the package for publishing

## Project Structure

- `src/lib/` — library source (Select.svelte, composables, types, utils)
- `src/lib/styles/` — component styles
- `tests/src/select.test.ts` — main test file
- `tests/src/dependency-options.test.ts` — dependency options tests
- Package manager: pnpm

## Architecture

Shared reactive store: `createSelectState<Item>()` (`src/lib/select-state.svelte.ts`) combines live
getter/setter accessors over `Select.svelte`'s bindable props with internal shared `$state`.
Composables receive that single store (plus a small `actions` object for callbacks) and read/write
`state.value`, `state.hoverItemIndex`, etc. directly — per-field access tracks only that field's
signal. Composables are generic over `Item extends SelectItem` and own their domain effects;
`Select.svelte` keeps only cross-cutting coordination effects.

Composables in `src/lib/`:
- `use-hover.svelte.ts` — hover index management + its effects
- `use-value.svelte.ts` — value normalization, selection, oninput dispatch + effects
- `use-load-options.svelte.ts` — async option loading (with a stale-response token) + effect
- `keyboard-navigation.svelte.ts` — publicly exported, takes the narrow `KeyboardNavigationState`
- `aria-handlers.svelte.ts`

## Key Svelte 5 Patterns

- Inside `$effect` bodies, keep the intended triggers as tracked reads at the top and wrap
  composable calls in `untrack()` so incidental reads don't become dependencies:

```js
$effect(() => {
    state.value; // tracked trigger
    untrack(() => dispatchSelectedItem()); // untracked execution
});
```

- Never name a component-local variable `state` — it collides with the `$state` rune
  (the store is called `selectState` inside `Select.svelte`).
- Unit tests for composables that register `$effect`s must be named `*.svelte.test.ts`
  (vite-plugin-svelte compiles the `.svelte.` infix) and create the composable inside
  `$effect.root(...)` followed by `flushSync()` — see `tests/src/lib/use-load-options.svelte.test.ts`.
