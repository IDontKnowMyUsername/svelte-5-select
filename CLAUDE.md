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

Composable pattern: `useX(context)` where context provides `getState()` closures over `$state` and setter callbacks.

Composables in `src/lib/`:
- `use-hover.svelte.ts`
- `use-value.svelte.ts`
- `use-load-options.svelte.ts`
- `keyboard-navigation.svelte.ts`
- `aria-handlers.svelte.ts`

## Key Svelte 5 Pattern

When calling composable functions from `$effect` bodies, `context.getState()` reads ALL state signals, creating unwanted reactive dependencies. Wrap composable calls in `untrack()` inside effects, keeping only intended triggers tracked:

```js
$effect(() => {
    if (listOpen && value) {  // tracked triggers
        untrack(() => hoverManager.setValueIndexAsHoverIndex());  // untracked execution
    }
});
```
