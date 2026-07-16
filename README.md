<div style="text-align: center;">
  <img src="https://raw.githubusercontent.com/IDontKnowMyUsername/svelte-5-select/master/svelte-select.png" alt="Svelte 5 Select" width="150" />
  <h1>Svelte 5 Select</h1>
</div>
<div style="text-align: center;">
  <a href="https://npmjs.org/package/svelte-5-select">
    <img src="https://badgen.now.sh/npm/v/svelte-5-select" alt="version" />
  </a>
  <a href="https://npmjs.org/package/svelte-5-select">
    <img src="https://badgen.now.sh/npm/dm/svelte-5-select" alt="downloads" />
  </a>
</div>
<div style="text-align: center;">A select/autocomplete/typeahead Svelte 5 component.</div>

## Demos

[💥 Examples of every prop, event, snippet and more 💥](https://github.com/IDontKnowMyUsername/svelte-5-select/tree/master/src/routes/examples)

## Installation

```bash
npm install svelte-5-select
```

## Svelte 5
This work is forked from <a href="https://github.com/kodaicoder/svelte-5-select">kodaicoder/svelte-5-select</a> which itself was forked from <a href="https://github.com/rob-balfre/svelte-select">rob-balfre/svelte-select</a>


## Rollup and low/no-build setups
List position and floating is powered by `floating-ui`, see their [package-entry-points](https://github.com/floating-ui/floating-ui#package-entry-points) docs if you encounter build errors.


## Props

| Prop                   | Type      | Default         | Description                                                    |
| ---------------------- | --------- | --------------- | -------------------------------------------------------------- |
| items                  | `any[]`   | `null`          | Array of items available to display / filter                   |
| value                  | `any`     | `undefined`     | Selected value(s); an emptied selection is always `undefined`  |
| justValue              | `any`     | `undefined`     | Raw `itemId` value(s) of the selection (pairs with `useJustValue`); bindable, and setting it hydrates `value` on mount |
| itemId                 | `string`  | `value`         | Override default identifier                                    |
| label                  | `string`  | `label`         | Override default label                                         |
| id                     | `string`  | `null`          | id attr for input field                                        |
| filterText             | `string`  | `''`            | Text to filter `items` by                                      |
| placeholder            | `string`  | `Please select` | Placeholder text                                               |
| hideEmptyState         | `boolean` | `false`         | When no items hide list                                        |
| listOpen               | `boolean` | `false`         | Open/close list                                                |
| class                  | `string`  | `''`            | container classes                                              |
| containerStyles        | `string`  | `''`            | Add inline styles to container                                 |
| clearable              | `boolean` | `true`          | Enable clearing of value(s)                                    |
| disabled               | `boolean` | `false`         | Disable select                                                 |
| multiple               | `boolean` | `false`         | Enable multi-select                                            |
| searchable             | `boolean` | `true`          | If `false` search/filtering is disabled; typing moves to the next matching option (type-ahead) |
| groupHeaderSelectable  | `boolean` | `false`         | Enable selectable group headers                                |
| focused                | `boolean` | `false`         | Input focus; set `true` to focus the input, `false` to blur it and close the list |
| listAutoWidth          | `boolean` | `true`          | If `false` will ignore width of select                         |
| showChevron            | `boolean` | `false`         | Show chevron                                                   |
| inputAttributes        | `object`  | `{}`            | Pass in HTML attributes to Select's input                      |
| placeholderAlwaysShow  | `boolean` | `false`         | When `multiple` placeholder text will always show              |
| loading                | `boolean` | `false`         | Shows `loading-icon`. `loadOptions` will override this         |
| listOffset             | `number`  | `5`             | `px` space between select and list                             |
| debounceWait           | `number`  | `300`           | `milliseconds` debounce wait                                   |
| floatingConfig         | `object`  | `{}`            | [Floating UI Config](https://floating-ui.com/)                 |
| hasError               | `boolean` | `false`         | If `true` sets error class and styles                          |
| name                   | `string`  | `null`          | Name attribute of hidden input, helpful for form actions       |
| required               | `boolean` | `false`         | If `Select` is within a `<form>` will restrict form submission |
| multiFullItemClearable | `boolean` | `false`         | When `multiple` selected items will clear on click             |
| closeListOnChange      | `boolean` | `true`          | After selection the list will close                            |
| clearFilterTextOnBlur  | `boolean` | `true`          | If `false`, `filterText` value is preserved on blur            |
| useJustValue           | `boolean` | `false`         | Hidden form input uses `justValue` (raw id) instead of JSON    |
| filterSelectedItems    | `boolean` | `true`          | When `multiple`, hide selected items from the list             |
| inputStyles            | `string`  | `''`            | Add inline styles to the input                                 |
| listStyle              | `string`  | `''`            | Add inline styles to the list                                  |
| hoverItemIndex         | `number`  | `0`             | Index of the currently hovered item (bindable)                 |
| loadOptionsDeps        | `any[]`   | `[]`            | When these values change, `loadOptions` re-fires               |
| ariaLabel              | `string`  | `undefined`     | Explicit `aria-label` for the input (and the listbox); when omitted, a `<label for={id}>` (or the placeholder, as a last resort) names it |
| ariaErrorMessage       | `string`  | `undefined`     | id of your error element; wired to the input's `aria-errormessage` while `hasError` is `true` |
| ariaClearSelectLabel   | `string`  | `'Clear selection'` | `aria-label` for the clear-all button                     |
| ariaRemoveItemLabel    | `(label: string) => string` | ``(label) => `Remove ${label}` `` | `aria-label` for each multi-select tag's remove button |
| ariaCleared            | `() => string` | see below  | Announcement after the selection is cleared                    |
| ariaEmpty              | `() => string` | see below  | Announcement when the open list has no options                 |
| ariaLoading            | `() => string` | see below  | Announcement while the open list is loading                    |
| ariaFocused            | `() => string` | see below  | Announcement when the input receives focus                     |
| ariaListOpen           | `(label: string, count: number) => string` | see below | Announcement when the list opens on a focused option           |
| ariaValues             | `(values: string) => string` | see below | Announcement naming the current selection                      |

The `aria*` text-builder defaults are shown in the [A11y](#a11y-accessibility) section. See [Function props](#function-props) for the overridable behavior functions (`loadOptions`, `filter`, `groupBy`, and friends).

### Bindable props

`value`, `filterText`, `items`, `listOpen`, `loading`, `focused`, `justValue`, and `hoverItemIndex` support `bind:`. The DOM references `container` and `input` are also bindable.

```svelte
<Select {items} bind:value bind:listOpen />
```


## Snippets

Rendering is customized with [snippets](https://svelte.dev/docs/svelte/snippet). Declare them inside `<Select>` and they are passed as props automatically.

```svelte
<Select {items}>
  {#snippet prependSnippet()}
    <span>🔍</span>
  {/snippet}

  {#snippet itemSnippet(item, index)}
    <div>{index + 1}. {item.label}</div>
  {/snippet}

  {#snippet selectionSnippet(selection)}
    <strong>{selection.label}</strong>
  {/snippet}
</Select>
```

| Snippet prop          | Arguments            | Description                                            |
| --------------------- | -------------------- | ------------------------------------------------------ |
| chevronIconSnippet    | `listOpen`           | Chevron indicator icon                                 |
| clearIconSnippet      | —                    | Clear indicator icon                                   |
| emptySnippet          | —                    | Shown when there are no items to display               |
| inputHiddenSnippet    | `value`              | Override the hidden form input(s)                      |
| itemSnippet           | `item, index`        | A list item                                            |
| listAppendSnippet     | —                    | Rendered after the list                                |
| listPrependSnippet    | —                    | Rendered before the list                               |
| listSnippet           | `filteredItems`      | Replace the entire list                                |
| loadingIconSnippet    | —                    | Loading indicator icon                                 |
| multiClearIconSnippet | —                    | Remove icon on multi-select items                      |
| prependSnippet        | —                    | Rendered before the value container                    |
| requiredSnippet       | `value`              | Override the hidden native `required` input            |
| selectionSnippet      | `selection, index?`  | A selected value (`index` only in `multiple` mode)     |


## Events (callback props)

Events are plain callback props. Handlers receive the value directly — there is no `CustomEvent` and no `event.detail`.

```svelte
<Select {items} onchange={(value) => console.log('selected', value)} />
```

| Prop        | Arguments           | Description                                                        |
| ----------- | ------------------- | ------------------------------------------------------------------ |
| onblur      | `event: FocusEvent` | fires when the input loses focus                                   |
| onchange    | `value`             | fires when the user selects an option                              |
| onclear     | `value`             | fires when the value is cleared or a multi-select item is removed  |
| onerror     | `{ type, details }` | fires when an error is caught (e.g. a `loadOptions` rejection)     |
| onfilter    | `items`             | fires when `listOpen: true` and items are filtered                 |
| onfocus     | `event: FocusEvent` | fires when the input gains focus                                   |
| onhoveritem | `index`             | fires when `hoverItemIndex` changes                                |
| oninput     | `value`             | fires when the value has been changed                              |
| onloaded    | `options`           | fires when `loadOptions` resolves                                  |
| onselect    | `selection`         | fires when an item is selected                                     |


### Items

`items` can be simple arrays or collections.

```html
<script>
  import { Select } from 'svelte-5-select';

  let simple = ['one', 'two', 'three'];

  let collection = [
    { value: 1, label: 'one' },
    { value: 2, label: 'two' },
    { value: 3, label: 'three' },
  ];
</script>

<Select items={simple} />

<Select items={collection} />
```

They can also be grouped and include non-selectable items.

```html
<script>
  import { Select } from 'svelte-5-select';

  const items = [
    {value: 'chocolate', label: 'Chocolate', group: 'Sweet'},
    {value: 'pizza', label: 'Pizza', group: 'Savory'},
    {value: 'cake', label: 'Cake', group: 'Sweet', selectable: false},
    {value: 'chips', label: 'Chips', group: 'Savory'},
    {value: 'ice-cream', label: 'Ice Cream', group: 'Sweet'}
  ];

  const groupBy = (item) => item.group;
</script>

<Select {items} {groupBy} />
```

You can also use custom collections.

```html
<script>
  import { Select } from 'svelte-5-select';

  const itemId = 'id';
  const label = 'title';

  const items = [
    {id: 0, title: 'Foo'},
    {id: 1, title: 'Bar'},
  ];
</script>

<Select {itemId} {label} {items} />
```

### Async Items

To load items asynchronously then `loadOptions` is the simplest solution. Supply a function that returns a `Promise` that resolves with a list of items. `loadOptions` fires once on mount, on typing non-empty `filterText` (debounced), and whenever `loadOptionsDeps` or `disabled` change. Emptying the filter text or closing the list cancels a pending typing-driven load instead of re-fetching.

```html
<script>
  import { Select } from 'svelte-5-select';

  import { someApiCall } from './services';

  async function examplePromise(filterText) {
    // Put your async code here...
    // For example call an API using filterText as your search params
    // When your API responds resolve your Promise
    let res = await someApiCall(filterText);
    return res;
  }
</script>

<Select loadOptions={examplePromise} />
```


### Advanced List Positioning / Floating 

`svelte-5-select` uses [floating-ui](https://floating-ui.com/) to control the list floating. See their docs and pass in your config via the `floatingConfig` prop.

```html
<script>
  import { Select } from 'svelte-5-select';

  let floatingConfig = {
    strategy: 'fixed'
  }
</script>

<Select {floatingConfig} />
```

### Function props

Core behavior can be overridden by passing your own functions as props. Look through the test suite ([tests/src/select.test.ts](/tests/src/select.test.ts)) and [src/lib/filter.ts](/src/lib/filter.ts) for examples.

```svelte
<script>
  import { Select } from 'svelte-5-select';

  // How a single item is matched against filterText
  const itemFilter = (label, filterText, option) => label.toLowerCase().includes(filterText.toLowerCase());

  // Grouping
  const groupBy = (item) => item.group;
  const groupFilter = (groups) => groups; // sort/filter group order
  const createGroupHeaderItem = (groupValue, item) => ({ value: groupValue, label: groupValue });

  // Async loading — must return a Promise that resolves with items
  const loadOptions = async (filterText) => fetchMyItems(filterText);

  // Debounce used by loadOptions
  let timeout;
  const debounce = (fn, wait = 1) => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, wait);
  };

  // Runs when the clear indicator is clicked
  const handleClear = () => { /* your own clearing logic */ };
</script>

<Select {items} {itemFilter} {groupBy} {groupFilter} {createGroupHeaderItem} {loadOptions} {handleClear} />
```

The `filter` prop replaces the entire filtering pipeline — override it at your own risk.

| Prop                  | Type                                              | Description                                                                                  |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| loadOptions           | `(filterText: string) => Promise<Item[] \| string[]>` | Load items asynchronously; see [Async Items](#async-items). Overrides the `loading` prop. |
| itemFilter            | `(label: string, filterText: string, option) => boolean` | Whether one item matches `filterText`. Defaults to a case-insensitive substring match.  |
| groupBy               | `(item) => string`                                | Group items under headers by the returned key. Unset by default.                            |
| groupFilter           | `(groups: string[]) => string[]`                  | Sort or filter the group order. Defaults to identity (`(groups) => groups`).                |
| createGroupHeaderItem | `(groupValue: string, item) => SelectItem`        | Build the header item for a group. Defaults to `{ value: groupValue, label: groupValue }`.  |
| debounce              | `(fn: () => void, wait: number) => void`          | Debounce strategy for `loadOptions`. Defaults to a `setTimeout` of `debounceWait` ms.       |
| handleClear           | `(e?: MouseEvent) => void`                        | Runs when the clear indicator is clicked. Defaults to clearing `value` and refocusing.      |
| filter                | `(config: FilterConfig) => SelectItem[]`          | Replaces the entire filtering pipeline. Defaults to the built-in `filter`. Override at your own risk. |

### Instance methods

A component reference exposes a couple of methods:

```svelte
<script>
  import { Select } from 'svelte-5-select';

  let select;
</script>

<Select bind:this={select} {items} />

<button onclick={() => console.log(select.getFilteredItems())}>Log filtered items</button>
<button onclick={() => select.reset()}>Reset</button>
```

## TypeScript

The component is generic over your item type: values, items, snippets, and callbacks are typed from the `items` you pass in — plain interfaces work, no index signature needed. The `multiple` prop narrows types too: with `multiple`, `bind:value` and the `oninput`/`onchange` payloads are `Item[]`; without it they are `Item | null` (`null` is dispatched when the selection is cleared).

```svelte
<script lang="ts">
  interface Country {
    code: string;
    name: string;
  }

  let countries: Country[] = [
    { code: 'de', name: 'Germany' },
    { code: 'fr', name: 'France' },
  ];
  let value: Country[] | undefined = $state();
</script>

<Select items={countries} itemId="code" label="name" multiple bind:value oninput={(v) => v.length} />
```

`SelectProps`, `SelectItem`, `SelectValue`, and `SelectValueProp` (the bindable `value` shape, which also accepts raw string ids) are exported for annotating your own wrappers.

## A11y (Accessibility)

The input renders as a WAI-ARIA combobox with a listbox popup, including `aria-expanded`, `aria-activedescendant`, `aria-required`, `aria-invalid`, `aria-busy` (while loading), and `aria-multiselectable` where applicable. When `groupBy` is set, each group's options are wrapped in a `role="group"` region named by its header (via `aria-labelledby`). Set `hasError` with `ariaErrorMessage` to wire the input to an external error element via `aria-errormessage`. A `disabled` Select marks the input `aria-disabled` + `readonly` (rather than natively `disabled`) so the combobox and its value stay in the accessibility tree and remain announceable, while staying non-interactive and out of the tab order. Keyboard support covers ArrowUp/ArrowDown, PageUp/PageDown, Home/End, Enter, Tab, Escape, `Alt`+ArrowDown/ArrowUp (open/close), Space (select in select-only mode), and Backspace/ArrowLeft/ArrowRight for multi-select items; with `multiFullItemClearable`, each tag is a focusable button that Enter/Space removes. The focused input shows a ring (`--focused-box-shadow`) in addition to the border colour; the option under the keyboard cursor shows a >=3:1 outline (`--item-hover-outline`) on top of the hover background; the spinner and item transitions respect `prefers-reduced-motion`; and focus/selection stay visible under Windows High Contrast Mode (`forced-colors`).

Give the input an accessible name with either `ariaLabel` or an external `<label for={id}>` (set the `id` prop). In development the component logs a `console.warn` if it finds neither `ariaLabel`, an `aria-labelledby`, nor an associated `<label>` — the placeholder is only a last-resort fallback that some screen readers ignore. The warning is stripped from production builds.

Selection and list state (including the empty/loading state) are announced through two polite `role="status"` live regions; the visible "No options"/"Loading Data" text is `aria-hidden` so it is not read twice. Override these props to change the screen-reader announcement text:

```svelte
<Select
  {items}
  ariaLabel="Choose a flavour"
  ariaValues={(values) => `Option ${values}, selected.`}
  ariaListOpen={(label, count) => `You are currently focused on option ${label}. There are ${count} results available.`}
  ariaFocused={() => `Select is focused, type to refine list, press down to open the menu.`}
  ariaEmpty={() => `No options`}
  ariaLoading={() => `Loading Data`}
  ariaCleared={() => `Selection cleared.`}
  ariaClearSelectLabel="Clear selection"
  ariaRemoveItemLabel={(label) => `Remove ${label}`}
/>
```

## Migrating from svelte-select (Svelte 4)

The public API moved to idiomatic Svelte 5:

- **Slots → snippets.** `<div slot="item" let:item />` becomes `{#snippet itemSnippet(item, index)}...{/snippet}` declared inside `<Select>`. See the [Snippets](#snippets) table for the full mapping (`slot="chevron-icon"` → `chevronIconSnippet`, etc.).
- **Events → callback props.** `on:change={(e) => e.detail}` becomes `onchange={(value) => ...}` — handlers receive the value directly, with no `event.detail`.
- **`export let` overrides → regular props.** Functions like `itemFilter`, `groupBy`, and the aria text builders are passed as props.
- **CSS variables are kebab-case.** `--borderRadius` is now `--border-radius`; see [the full list](/docs/theming_variables.md).

## Migrating from 1.x to 2.0

Every change below is covered in detail in the [changelog](CHANGELOG.md); this is the upgrade checklist:

- **An emptied `value` is always `undefined`.** Every clear path (clear button, last tag removed, `loadOptionsDeps` invalidation, disable, multiple→single switch) writes `undefined` — never `null` or `[]` — so test emptiness with falsiness, not `=== null`. `justValue` follows the same rule. Clearing a single select dispatches `oninput(null)` instead of `oninput([])`.
- **Removed exports.** `useKeyboardNavigation` (with the `KeyboardNavigationContext`/`isCancelled` surface and the `SelectState`, `KeyboardNavigationState`, `KeyboardNavigationActions` types) and `isStringArray` are gone; the composables are internal.
- **`ErrorEvent` is renamed `SelectErrorEvent`** (the old name shadowed the DOM global; it remains as a deprecated alias).
- **Rendered-list surfaces are typed `SelectRow<Item>`.** `getFilteredItems()`, `onfilter`, `listSnippet`, and `itemSnippet` see the group headers `groupBy` synthesizes; narrow rows with the exported `isGroupHeader` guard.
- **`SelectValue` takes a `Multiple` type parameter** (inferred from the `multiple` prop), and `onclear` receives the `Multiple`-discriminated `SelectClearValue` instead of a flat union.
- **`loadOptions` triggers changed.** It fires on mount, on typing, on `loadOptionsDeps` changes, and on disabled toggles — never on list open/close. Pending fetches that become moot are cancelled, results are no longer re-filtered by `itemFilter`, and only deps-driven reloads clear a stale value.
- **`selectionSnippet` is `Snippet<[Item, number?]>`** — always a single item, also in multiple mode.
- **`FilterConfig.filterGroupedItems` is renamed `applyGrouping`** (only affects custom `filter` implementations).
- **Markup and a11y changes.** The multi-select remove control is a real `<button>` in the tab order; grouped options are wrapped in `role="group"` regions named by their headers; the input no longer defaults its `aria-label` to the placeholder (name it with `ariaLabel` or an external `<label for>`).
- **Behavior fixes worth re-testing:** `bind:focused` writes now move real DOM focus, and an initial `filterText` is kept on mount (it used to be silently cleared) — it opens the list and drives the mount `loadOptions` fetch.
- **Node >= 22.12 is required.**

## CSS custom properties (variables)

You can style a component by overriding [the available CSS custom properties](/docs/theming_variables.md).

```html
<script>
  import { Select } from 'svelte-5-select';
</script>

<Select --border-radius= "10px" --placeholder-color="blue" />
```

You can also use the `inputStyles` prop to write in any override styles needed for the input.

```html
<script>
  import { Select } from 'svelte-5-select';

  const items = ['One', 'Two', 'Three'];
</script>

<Select {items} inputStyles="box-sizing: border-box;"></Select>
```

### 🧪 Experimental: Replace styles (Tailwind, Bootstrap, Bulma etc)
If you'd like to supply your own styles use: `import Select from 'svelte-5-select/no-styles/Select.svelte'`. Then somewhere in your code or build pipeline add your own. There is a tailwind stylesheet via `import 'svelte-5-select/tailwind.css'`. It uses `@import 'tailwindcss'` and `@apply`, so your app must have Tailwind CSS v4 set up to process it.


## License

[License](LICENSE)
