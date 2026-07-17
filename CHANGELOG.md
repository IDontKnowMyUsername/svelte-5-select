# svelte-5-select changelog

<!-- Maintainer note: this file is hand-written. On release, retitle "Unreleased"
     to "x.y.z (yyyy-mm-dd)". release-it's conventional-changelog plugin only
     computes the version bump and the GitHub release notes; it does not write
     to this file. -->

## Unreleased

### ⚠ Breaking changes

* `oninput` is renamed `onValueChange` and `onchange` is renamed `onSelectionChange` — same payloads, same firing rules (all references below use the new names). The old names collided with DOM-event expectations on a component wrapping a text input: `oninput` never fired per keystroke (typing is `bind:filterText`), while the neighbouring `onfocus`/`onblur` props ARE literal DOM passthroughs. The new names follow the headless-library state-change convention
* Tab only commits the highlighted option after expressed intent — moving the cursor with the keyboard, real pointer movement over the open list, or typing during that open. The cursor auto-parks on the first option when the list opens, so merely opening the control and tabbing away used to silently select that parked option; it now just closes the list (APG behavior). Present-but-untyped filter text (a seeded initial value, or text retained across a close with `clearFilterTextOnBlur={false}`) does not arm a commit, and neither does the `mouseover` browsers synthesize when the list renders under a stationary cursor. Single-press Tab-commit after navigating or typing is unchanged
* The published types use `NoInfer` on the configuration callbacks (`groupBy`, `itemFilter`, `createGroupHeaderItem`, `filter`), so consuming the types needs TypeScript >= 5.4. Only `items`, `value`, and `loadOptions` drive `Item` inference now: a pre-annotated callback const with a looser param type used to hijack `Item` and surface baffling weak-type errors on `items`/`loadOptions`; an incompatible callback now errors on the callback itself
* `useKeyboardNavigation` is no longer exported from the package, and neither are the `SelectState`, `KeyboardNavigationState`, and `KeyboardNavigationActions` types — the composables were reworked around an internal shared reactive state store and are not a supported extension point. (The released 1.0.x line exported `useKeyboardNavigation` alongside a `KeyboardNavigationContext`/`isCancelled` surface; all of it is gone.)
* `loadOptions` is no longer re-run when the list opens or closes — it fires on typing (non-empty filter text), `loadOptionsDeps` changes, mount, and disabled toggles; closing the list never triggers a fetch. One exception on open: reopening with retained non-empty filter text (`clearFilterTextOnBlur={false}`) whose results are stale — because the load was cancelled by the close or errored — re-fetches immediately. Mount and dependency loads now fire immediately instead of inheriting the typing debounce
* A filter-driven `loadOptions` result no longer clears a selection that is missing from the narrowed results; only dependency-driven reloads (`loadOptionsDeps`) validate and clear stale values
* A pending debounced `loadOptions` fetch is cancelled when it becomes moot — an item is selected, the filter text is emptied, the list closes, the select is disabled, or the component unmounts. In-flight responses arriving after a disable are discarded
* `loadOptions` results are no longer re-filtered by the label substring filter — what the loader returns is what the list shows (apps no longer need an `itemFilter={() => true}` workaround)
* Enter and Escape pass through when the list is closed, so implicit form submission and dialog-close keep working; keys only stop propagation when the component actually handles them
* Group headers no longer render `role="group"`/`aria-label` — an element with `role="option"`/`role="presentation"` may not contain a group, and the group wrapped only the header text. (Group semantics did not stay removed: they returned in a spec-valid shape later in this release — see Added)
* The multi-select tag remove control is now a real `<button>` in the tab order (was an unreachable `tabindex="-1"` div); removal is activated on `click` instead of `pointerup`, and removing an item refocuses the input
* Arrow-key navigation now uses the same selectability rule as click/Enter (`selectable !== false`), so an item with an explicit `selectable: undefined` is reachable by keyboard
* Removed the vestigial `build:lib` script and `vite.lib.config.ts` (a Svelte-4-era bundle build that clobbered `dist/`); `npm run package` is the library build
* `SelectValue` now takes a second `Multiple` type parameter: `SelectProps<Item, true>` types `value` and the `onValueChange`/`onSelectionChange` payloads as `Item[]`, and single mode as `Item | null`. The `multiple` prop drives inference, so `<Select multiple>` narrows automatically; `SelectValue<Item>` without the parameter keeps the loose union
* An emptied `value` now has exactly one representation — `undefined`, in both single and multiple mode, on every clear path. Previously the clear button and last-tag removal wrote `undefined`, a multiple→single switch wrote `null`, and a `loadOptionsDeps` invalidation or a disable wrote `[]` in multiple mode, so consumers had to test for three different empties (and `SelectValueProp` advertised a `null` the component never wrote). `value` still *accepts* `null` on the way in, so `bind:value={null}` keeps working; read an emptied value as falsy rather than `=== null`. `justValue` follows the same rule (`undefined`, never `''`/`[]`). The `onValueChange`/`onSelectionChange` payload is unchanged and remains a separate contract (`null` single, `[]` multiple)
* Clearing a single select dispatches `onValueChange(null)` instead of `onValueChange([])` (an empty array is truthy, so `if (payload)` misread "cleared" as "has value"); multiple mode still dispatches `[]`
* `ErrorEvent` is renamed `SelectErrorEvent` and the old name is removed (it shadowed the DOM's global `ErrorEvent`, so a consumer file importing it silently changed the meaning of the global elsewhere in scope); update imports to `SelectErrorEvent`
* The input no longer gets a default `aria-label` of the placeholder text, which overrode an external `<label for={id}>` in accessible-name computation; set `ariaLabel` for an explicit label, otherwise the placeholder still names the input as the spec's last-resort fallback
* `selectionSnippet` is typed `Snippet<[Item, number?]>` — it always received a single item at runtime (each tag in multiple mode), never an array
* The `onclear` payload is now typed with the `Multiple`-discriminated `SelectClearValue<Item, Multiple>` instead of the flat `SelectValue<Item, Multiple> | Item | string` union: single mode is `Item | string | null` (no stray array), and the single removed-tag entry only appears in the multiple branch. Runtime payloads are unchanged
* The rendered-list surfaces are typed `SelectRow<Item>` (`Item | SelectGroupHeader`) instead of `Item[]`: `getFilteredItems()`, `onfilter`, `listSnippet`, and `itemSnippet` all see the group headers that `groupBy` synthesizes, and those headers are not your item type — with `interface Country { code: string }` they arrived typed as `Country` with no `code`. Narrow rows with the new exported `isGroupHeader` guard. Without `groupBy` no header is ever produced, but the type cannot know that statically, so the guard is a one-line narrow
* `onloaded` receives `(Item | SelectItem)[]` instead of `Item[]`: a string-resolving `loadOptions` delivers the synthesized `{ value, label, index }` items built from the strings, which are not your item type. Inline handlers keep compiling (the parameter is inferred); only handlers explicitly annotated `(opts: Item[]) => void` need the widened annotation. An item-resolving loader still only ever delivers `Item`s
* `isStringArray` is no longer exported — an internal type guard with no consumer use case (`filter` and `normalizeItem` remain exported)
* `FilterConfig.filterGroupedItems` is renamed `applyGrouping` — it was a near-homograph of the unrelated `groupFilter` prop (the transform builds the grouped list; the prop only reorders group keys). Only affects custom `filter` implementations that read the field
* The published `engines.node` is `>=18` — Svelte 5's own floor, since the library runs wherever Svelte 5 runs. (It briefly declared `>=22.12`, which encoded this repository's vite 8 dev requirement and hard-failed consumers on Node 20 LTS with `engine-strict`.) Developing this repository still needs Node >= 22.12, enforced by CI, which tests Node 22 and 24; Node 20 is EOL and untested there

### Added

* Generic item typing: `<Select>` and the composables are generic over your item type, flowing into props, snippets, callbacks, and instance exports. The bound is the new `ItemLike` (`Record<string, any>`), so interface-declared item types work without an index signature (they previously failed the `SelectItem` constraint with an opaque error)
* `value` officially accepts raw string ids (`string`/`string[]`) and normalizes them against `items`; the new `SelectValueProp` type names that bindable shape
* New exports: `normalizeItem`, `isGroupHeader`, and the `ItemLike`, `SelectValueProp`, `SelectClearValue`, `SelectErrorEvent`, `SelectRow`, and `SelectGroupHeader` types
* `ariaEmpty`, `ariaLoading`, and `ariaCleared` props customize the new live-region announcements (see Fixed)
* Type-ahead for select-only mode: with `searchable={false}`, printable characters move hover to the next matching option (APG combobox pattern), open the closed list, and support repeated-initial cycling
* Home/End move hover to the first/last selectable option while no filter text is entered
* `aria-required`, `aria-invalid`, and `aria-multiselectable` reflect the `required`, `hasError`, and `multiple` props
* `aria-disabled` marks non-selectable options, matching the keyboard-navigation skip
* The active tag in multi mode (ArrowLeft/ArrowRight + Backspace) is announced via the live region; previously it was only a CSS outline
* Accessible names on the combobox input (`ariaLabel` prop), clear button, and tag remove buttons
* Grouped options render inside `role="group"` wrapper regions named by their headers via `aria-labelledby`, restoring group semantics to assistive tech in the structure the listbox pattern allows (replacing the spec-invalid flat `role="group"` on the header row that the Breaking section removes)
* Dev-only warning when `loadOptionsDeps` changes by identity but not by content: deps elements are compared with `===`, so an inline object/array literal recreated per parent render re-fires the reload — and its selection validation — on every render. Pass primitives or stable references (the warning is tree-shaken from production builds)

### Fixed

* A completed selection consumes Tab's commit-intent: with `closeListOnChange={false}` the list stays open after picking and the cursor re-parks on a neighbouring option (the picked item leaves the filtered list), and tabbing away then silently selected that neighbour — firing `onselect`/`onSelectionChange`/`onValueChange` for an item the user never chose. Tab now just closes the list until intent is expressed again
* Event handlers passed via `inputAttributes` (`oninput`, `onblur`, `onfocus`, `onkeydown`) compose with the component's own handlers (internal first, then yours) instead of silently replacing them — a consumer `oninput` used to disable filtering, list-opening, and Tab typing-intent entirely
* A parent clearing `bind:value` with `null` no longer writes that `null` back into `justValue`: every emptied selection now derives `justValue` as `undefined`, as the `JustValue` contract documents (`null`/`[]` are accepted on the way in but never written back)
* Tailwind theme: hovering no longer drops the container border below the 3:1 boundary-contrast bar (WCAG 1.4.11) — preflight defaults borders to `currentColor`, so the `gray-400` hover *lightened* the boundary to ~2.5:1 at the moment of interaction; it now uses `gray-500`, mirroring the default theme's `--border-hover`
* Both themes: the arrow-key tag cursor survives forced-colors mode (Windows High Contrast) — it differed from an ordinary chip only by outline colour, which the forced palette flattens to the same system colour, so the Backspace target was invisible; it now uses a 2px dashed outline there
* Clicking a non-input surface of the control (the chevron area, a chip, multi-mode whitespace) can close an open list again: in real browsers the press blurred the input, blur closed the list, and the press's own bubbled pointerup read the fresh closed state and toggled the dropdown straight back open — those surfaces could never close it. The container now cancels `mousedown` everywhere except on the input itself (caret placement and text selection are unaffected)
* Removing a `multiFullItemClearable` tag by pointer keeps focus on the input and announces the removal: the chip click path never restored focus, so focus fell to `<body>` when the chip left the DOM and the focus-gated live regions dropped the announcement — a touch screen-reader user removing a tag heard nothing. The keyboard path was already correct
* The open listbox has an accessible name on every naming path the component endorses (ARIA 1.2): a label names only the input, not the floating list, so the listbox was unnamed unless `ariaLabel` was set. An external `<label for>` is now referenced via `aria-labelledby` (or its text is snapshotted into `aria-label` when it has no `id`), an `aria-labelledby` supplied through `inputAttributes` is forwarded to the listbox, and an implicit wrapping `<label>` contributes only its own text — not the chips, options, and live-region text rendered inside it. An explicit `ariaLabel` still wins
* Restoring a removed `loadOptions` prop fires the initial fetch again: the load effect's run snapshot survived the removal, so the restore found "no changed input" and left the control permanently empty
* A stale arrow-key tag cursor can no longer clear the wrong tag: the cursor index survives a mouse removal's reindexing, and Backspace then fired `onclear(undefined)` — or, with one tag left, removed the remaining tag the cursor never pointed at. A stale press now resets the cursor (the next press removes normally), ArrowLeft re-enters from the last tag, and out-of-range indices never reach the removal path
* Replacing an entry of a bound `value` array in place (`value[0] = x`) now registers like `value.push` already did: the tag re-renders either way, but `onValueChange` never fired and `justValue` went stale because the effects tracked only the array reference and its length — they now track the entries too
* A replacement single value supplied together with a multiple→single flip survives: the transition wipe keyed on truthiness and cleared the deliberate new selection along with the stale array shape it was meant to remove
* Mounting with `multiple` and a bare (non-array) item no longer dispatches a spurious `onValueChange([item])` — the mount wrap is shape normalization, not a selection change, and the dispatch baseline now follows it
* A bare (non-array) value written while `multiple` stays on is wrapped into an array like it is at mount, instead of silently rendering no chip and deriving a scalar `justValue`
* Moving a multiple-mode `value` between its two empty representations (`undefined`/`null` and `[]`) no longer dispatches a spurious `onValueChange([])` — both are the same no-selection state; a real clear (tags → empty) still reports `[]`
* A seeded `justValue` is no longer clobbered when the initial `value` is an empty array: the sync derived `[]` from the not-yet-hydrated `value={[]}` and overwrote the very `justValue` hydration needed — permanently when items arrived late, leaving the selection unresolvable
* `JustValue` includes `undefined`: every clear path writes `justValue = undefined` (the one empty representation, mirroring `value`), but the named union omitted it — a strict consumer binding `bind:justValue` to a `JustValue`-typed variable had the annotation violated at runtime on every clear, and `=== null` empty checks missed. The type now tells the truth; read an emptied `justValue` as falsy
* The `exports` map gained a `default` condition on the main and `no-styles` entries: without it, every non-svelte-aware consumer — a plain node script importing the exported utilities (`filter`, `areItemsEqual`, `normalizeItem`), a test runner without the Svelte plugin, webpack/rspack without a custom `svelte` resolve condition — failed with `ERR_PACKAGE_PATH_NOT_EXPORTED` before their `.svelte` handling was ever consulted. The smoke test now resolves the package without the `svelte` condition to keep it that way
* Removing a tag via `multiFullItemClearable` no longer toggles the dropdown as a side effect: the chip's click removed the tag but let `pointerup` bubble to the container's list toggle, the same leak the dedicated remove and clear buttons already guard against
* A disabled multi select no longer removes tags on mouse click when `multiFullItemClearable` is set: the keyboard removal path was gated on `disabled` but the click path was not, so a pointer could mutate a disabled control's value (and fire `onclear`/`onValueChange`)
* The custom `filter` prop's return type is `(Item | SelectItem)[]` instead of `SelectItem[]`, so returning your own interface-typed items (no index signature) compiles — as the TypeScript docs promise. Existing filters returning `config.applyGrouping(...)` rows keep working
* A slow `loadOptionsDeps` reload can no longer wipe a selection the user made from fresher results: when typing during the reload delivered post-deps-change options and the user picked one, the late reload response still validated (and cleared) that brand-new selection against its own older results — `onValueChange(null)` fired and the choice visibly vanished. A committed selection now retires the pending reload's validation authority whenever the displayed results it was picked from are newer than the reload; a pick made from genuinely stale (pre-deps-change) options is still validated as before
* Closing the list (or emptying the filter text) while a `loadOptionsDeps` reload was in flight no longer destroys that reload: cancelling the moot typing query used the global invalidation, which also discarded the dependency reload's items *and* its stale-selection validation verdict — the list kept the previous dependency's options and an invalid selection survived, with nothing left to re-fetch. The cancel now hands authority back to the in-flight dependency reload, whose response then lands in full
* With `searchable={false}` and a selected value, the first type-ahead keypress on a closed list no longer looks ignored: the keypress opened the list and moved the keyboard cursor to its match, but the open-with-value hover effect then fired on the open transition and snapped the cursor back to the selected value — only a repeated press (no transition) landed on the match. Arrow/Space opens still snap to the selected value per the APG pattern
* The shipped Tailwind theme (`./tailwind.css`) caught up with accessibility fixes that had only been applied to the default theme: group titles no longer inherit the disabled-option dimming (they rendered at ~1.47:1 on white — group names are informative text, so WCAG 1.4.3's inactive-component exemption does not apply), the ArrowLeft/ArrowRight tag cursor in multi mode is visible again (the theme had no `.multi-item.active` rule, so Backspace targeted a chip with no visual indication), disabled options no longer paint the keyboard-cursor outline, and keyboard-focused chips keep a visible ring in forced-colors mode. The real-browser axe suite now also scans the compiled Tailwind theme so the two themes cannot silently drift again
* The Tailwind theme's placeholder text is readable: the theme only styled the *disabled* placeholder, so the enabled prompt fell through to Tailwind v4 preflight's 50%-alpha `::placeholder` — about 2.3:1 on white, a WCAG 1.4.3 failure on the control's primary prompt (and its last-resort accessible name). It now uses `gray-500`, mirroring the default theme's `#67727d` (~4.9:1); axe cannot evaluate placeholder contrast, so the browser suite pins the mechanism directly (the computed placeholder color must be fully opaque)
* Writing `bind:focused` now moves real DOM focus: `focused = true` focuses the input, `false` blurs it and closes the list. Previously the prop changed without focusing anything, while the window keydown handler — gated only on `focused` — claimed ArrowUp/ArrowDown/Enter/Escape page-wide, with no blur event ever able to reset it. Setting `focused = true` on a disabled Select is ignored
* An initial `filterText` prop is no longer silently wiped on mount when the Select starts unfocused (the mount-time close path applied `clearFilterTextOnBlur` before anything rendered). It is applied passively: the text is kept, it filters the list, and with `loadOptions` the mount fetch uses it — but the list stays closed and focus is not moved on page load (auto-opening would have grabbed keyboard focus as a side effect). Later programmatic `filterText` writes still behave like typing and open the list, now without a duplicate fetch when the auto-open lands
* Disabling a Select now releases focus and keyboard control: `focused` is reset, DOM focus is blurred, and the keyboard handlers additionally gate on `disabled`. Previously a Select disabled while it held focus (e.g. a form disabling controls during submit) stayed fully keyboard-operable — arrows reopened the list, Enter selected, Backspace removed tags — despite being `aria-disabled`; mounting with `focused: true, disabled: true` grabbed focus the same way
* The `required` fallback no longer strands focus on an invisible control: when native constraint validation focuses the hidden `aria-hidden` `<select>`, focus is forwarded straight to the real combobox input (focus on an aria-hidden element is an ARIA violation, and sighted keyboard users saw focus vanish into a 0-opacity element)
* The option under the keyboard cursor now shows a >=3:1 outline (new `--item-hover-outline` variable, default `2px solid #006fe8`; set it to `none` to opt out) — the `--item-hover-bg` background alone was a ~1.13:1 colour-only cue against the default white list (WCAG 1.4.11 Non-text Contrast)
* The last option's hover/selection background (and the keyboard-cursor outline) now follows the list's rounded bottom corners instead of squaring them off — a `last` class mirroring `first`, themable via the new `--item-last-border-radius` variable
* With `useJustValue`, a parent clearing `bind:value` programmatically had the old selection silently resurrected from the stale `justValue` (and the UI kept showing it); an external clear now behaves like the internal one and clears `justValue` too
* The internal clear flag (`clearState`) is now flushed and reset whenever it is set — not only when a co-occurring value change happens to carry it into the sync effect — so it can no longer stick `true` and silently block the next `justValue` hydration
* Clicking the clear button no longer bubbles `pointerup` to the container's list toggle — the list flickered open on every clear, and stayed open permanently with a custom `handleClear`; its `mousedown` is also prevented so clearing never steals focus from the input
* A blur arriving while the list was scrolling was dropped forever (list stuck open, window keydown kept hijacking arrows/Enter typed into other fields — most likely on touch momentum-scroll); it is now deferred and replayed once scrolling settles, unless focus returned to the input
* Typing while a `loadOptionsDeps` reload was in flight discarded that reload's response before it could validate the selection, so a now-invalid value survived the deps change; a superseded dependency reload still delivers its validation verdict (unless a newer dependency reload owns it)
* Screen readers announced every arrow key twice: `aria-activedescendant` already makes the focused option be read out, and the context live region re-emitted the option name *and* the full "There are N results available" count on each keystroke. The region now announces when the list opens and when filtering changes the count, and stays quiet while the cursor moves — roughly a third of the previous verbosity, per the APG pattern. `ariaListOpen`'s signature is unchanged
* With `multiFullItemClearable`, a keyboard-focused tag looked identical to an unfocused one: the chip is a real tab stop, but `.multi-item`'s unconditional `outline` overrode the browser's focus ring by cascade origin (WCAG 2.4.7 Focus Visible). Added a `.multi-item:focus-visible` ring, themable via `--multi-item-focus-outline`, with a forced-colors fallback
* The default `--border` (`#d8dbdf`) was 1.39:1 against the default white background and `--border-hover` (`#b2b8bf`) was 2.00:1, where WCAG 1.4.11 requires 3:1 to identify a control's boundary. Defaults are now `#858a93` (3.47:1) and `#67727d` (4.91:1); override the variables to restore the old look
* A custom `listSnippet` left `aria-activedescendant` pointing at an element that does not exist (the snippet replaces option rendering), so screen readers could not follow keyboard navigation. The attribute is still emitted — consumers who reproduce the documented `id="listbox-{id}-item-{index}"` contract get correct behavior — and a dev-only warning now fires when the reference dangles
* Screen readers: an open list with zero results (or still loading) announced nothing — it now announces the empty/loading state; clearing the selection announced nothing under `aria-relevant="additions text"` — it now announces "Selection cleared."; an empty-array `bind:value` in multiple mode announced the nonsense string "Option , selected."
* Mounting the component outside a Vite bundle (rollup, webpack, no-build — the setups the README points at) threw `TypeError: Cannot read properties of undefined (reading 'DEV')`: the dev-only accessible-name warning gated on `import.meta.env`, which only exists under Vite. The flag now comes from `esm-env`, which resolves under every bundler and tree-shakes the warning out of production builds
* The two live regions used hardcoded `aria-selection`/`aria-context` ids while every other id derives from the component's own id, so two Selects on one page emitted duplicate ids (a WCAG 4.1.1 failure that also makes the regions ambiguous to assistive tech). Both ids are now suffixed with the component id
* `bind:container` and `bind:input` now work as documented (the props were never `$bindable`, so following the README threw `bind_not_bindable`)
* List could not be closed (and refetched on every attempt) with `loadOptions` + `clearFilterTextOnBlur={false}`
* Selecting an item in an async select fired a spurious `loadOptions('')` and showed the loading spinner on the closed control; a fetch armed by typing could still fire after selection or close — both are cancelled now
* Mounting a disabled select with `loadOptions` and a preset `value` no longer wipes the value; only an actual disabled transition clears state
* Replacing one string `value` with another re-resolves it against `items` (previously only the empty↔non-empty flip re-normalized), and an initial string value now resolves to the real item once async items arrive
* `justValue` hydration waits for items instead of writing an empty selection: no more spurious `onValueChange([])` at mount, and hydration retries when async items arrive (single and multi mode)
* Multiple string values collapsed to a single entry when items were not yet resolvable (dedup keyed every raw string on `undefined`); multi-mode fallback normalization also respects a custom `itemId` now
* Keyboard navigation scrolls the hovered option into view again (`block: 'nearest'`), and opening the list scrolls to the selected option — lost in the composable refactor
* Custom `floatingConfig` (e.g. `placement`) was silently reverted by svelte-floating-ui's deferred recompute right after mount; overrides now merge into the config object the library holds a reference to
* `isScrolling` no longer wedges hover and blur permanently on browsers without `scrollend` (e.g. Safari < 18.2); a 150 ms fallback clears it
* Debounce and scroll-fallback timers are cleared on unmount, so a pending fetch can no longer run (and invoke `onloaded`/`onerror`) on a destroyed component
* A user-supplied `handleClear` prop is respected instead of always running the internal clear
* `getFilteredItems` is restored as a `bind:this` instance export (broken in the released 1.0.x line)
* Tab now commits the hovered option and moves focus in the same press — it previously swallowed the committing keystroke (`preventDefault`), so leaving the field took two Tab presses. Shift+Tab never commits: tabbing backwards through a form no longer selects the hovered option as a side effect
* A disabled Select was still mouse-operable when the list was opened programmatically (a `bind:listOpen` or `filterText` write while disabled): the list now force-closes whenever it opens while disabled, and item clicks are ignored as defence in depth
* A parent mutating a bound multiple `value` array in place (`value.push(...)`) rendered the new tag but never dispatched `onValueChange` and left `justValue` stale — the value effects tracked only the array reference. In-place growth now normalizes, dispatches, and syncs `justValue` exactly like an assignment
* The hover cursor no longer parks on a non-selectable first item in plain (non-grouped) lists when the list opens or the filter changes, and no longer skips a selectable first item that `groupBy` placed in a header-less (`''`) bucket — the hover path used an inverted selectability predicate (a missing `selectable` key read as non-selectable) that also only ran under `groupBy`, diverging from the click/Enter/arrow rule
* A raw string `value` rendered a blank selection (and announced "Option , selected.") when a custom `label` prop was set: the synthesized fallback item hardcoded a literal `label` key while the display reads the configured label field. The fallback is now keyed by the `itemId` and `label` props
* A `loadOptionsDeps` reload no longer clears more than it can prove stale: in multiple mode, entries the reloaded options still offer survive (previously one missing entry wiped the whole selection), and an empty reload result never clears — the reload queries with the retained (usually empty) filter text, so a search endpoint that returns `[]` for an empty query wiped a valid selection on every deps change
* A programmatic `filterText` write was silently ignored when it happened to equal the last *typed* value (the change detector compared against a stale scratch value), leaving the list closed while a `loadOptions` fetch still fired against it; every post-mount write now behaves like typing, as documented
* The `onhoveritem`/`onfilter` callbacks are invoked untracked: reactive reads inside the consumer's callback no longer become hidden effect dependencies, an inline callback prop changing identity per parent render no longer refires them, and an `onfilter` that writes `items` can no longer loop
* Re-clicking an already-selected option in multiple mode (visible with `filterSelectedItems={false}`) no longer wipes the typed filter text — the no-op guard now runs before the filter-text clear
* A debounced `loadOptions` call re-reads the loader when it fires instead of running the one captured when the debounce was armed, so a `loadOptions` prop swapped mid-wait can no longer run the old fetcher and attribute its response to the new one (a loader removed mid-wait fetches nothing and resets the spinner)
* Writing `bind:justValue` after mount now applies deterministically right away: it hydrates `value` when no selection exists, and is corrected back to the selection-derived values when one does (value wins). Previously a late write sat dormant — the sync effect did not watch `justValue` — and then hydrated the selection on the next unrelated state change, seemingly out of nowhere. `justValue` also keeps a stable identity while its entries are unchanged, instead of emitting a fresh array on every internal sync
* Non-selectable group headers are `aria-hidden` instead of `role="presentation"`: a listbox may only own option/group children — and groups are transparent for that check — so the presentational header row made the listbox's children invalid (axe `aria-required-children`, WCAG 1.3.1). The group's accessible name still resolves through `aria-labelledby`, which follows hidden targets; selectable headers remain real options
* Group titles no longer inherit the non-selectable dimming (`#999` = 2.84:1 — they are informative text, so WCAG 1.4.3's inactive-component exemption does not apply); they keep `--group-title-color` (default `#000`, 21:1)
* Repaired `tailwind.css` selectors and removed the dead camelCase CSS shim
* Added the README-documented no-styles, `tailwind.css`, and styles subpath exports that failed to resolve under strict exports, and corrected the license metadata (custom permissive text, not ISC)
* Removed the provably no-op window click handler; outside clicks keep closing the list via the input's native blur

### Tests

* New real-browser layout suite (`pnpm run test:browser`, vitest browser mode + Playwright) asserting floating placement, `listOffset`, list width, and scroll-into-view geometry; the corresponding happy-dom tests were vacuous (no layout engine) and were removed or rewritten as `scrollIntoView` spies
* Regression coverage for load cancellation, disabled-at-mount values, string-value re-resolution, late `justValue` hydration, type-ahead, `aria-disabled`, keyboard tag removal, and `bind:container`/`bind:input`
* Regression coverage for external `bind:value` clears with `useJustValue`, clear-button event containment, deferred blur replay after scrolling, superseded dependency-reload validation, and the live-region empty/loading/cleared announcements
* The two long-skipped geometry tests (item-label ellipsis, multi-tag wrap height) are ported to the real-browser suite — no skipped tests remain
* New axe-core WCAG A/AA scan in the browser suite covering the closed, open, grouped, multi, empty, disabled, and external-`<label for>` states (it caught the two grouped-list violations fixed above); best-practice page-composition rules are excluded as consumer responsibility
* The browser suite gained its first real-event interaction test (CDP-driven `userEvent`): clicking the chevron area closes an open list and keeps it closed — the blur-close/pointerup-reopen loop it pins is invisible to jsdom, which fires no focus moves on mousedown
* The `bind:hoverItemIndex` test asserts exact indices in both directions (navigation updates the binding; a parent write moves the rendered cursor) — the old test passed with the binding entirely broken
* Keyboard edge branches pinned: Space inside a live type-ahead query (multi-word labels stay reachable), Space on the already-selected option closing without re-dispatch, Alt+ArrowDown opening a closed list, and the full Tab intent matrix (bare open-then-Tab, typing arms / seeded-or-retained filter text does not, synthetic mouseover without pointer movement does not, close resets intent, a completed selection consumes intent when the list stays open)
* Regression pins for the `inputAttributes` handler composition (`oninput` still filters, `onkeydown` still closes on Escape, both consumer handlers invoked) and for external `null`/`[]` clears deriving `justValue` as `undefined`
* The browser suite pins the Tailwind hover border at >=3:1 with a real pointer hover (axe does not evaluate border contrast) and structurally pins the forced-colors `.multi-item.active` rule in both themes (width + style, since the forced palette flattens outline colours)

### Build

* All GitHub Actions in the CI and publish workflows are pinned to full commit SHAs (with version comments dependabot keeps fresh) — the publish workflow holds `id-token: write`, so a hijacked action tag must not be able to reach it
* The CHANGELOG release convention is now enforced twice: release-it aborts before tagging when the "Unreleased" section was not retitled to the new version (`scripts/check-changelog.mjs` in the `after:bump` hook), and the publish workflow re-checks the same invariant on the tag before `npm publish`
* The publish workflow refuses tags whose commit is not an ancestor of `origin/master`: with trusted publishing, tag-push rights are publish rights, and the gates only prove the tagged tree is internally consistent — a tag on a side-branch or stale commit would otherwise ship code that never landed on the trunk. The CI workflow's `GITHUB_TOKEN` is also dropped to read-only (`permissions: contents: read`)
* The publish workflow is split into an unprivileged gate job and a minimal publish job: previously every gate step — vitest, playwright, the smoke app's fresh-from-registry `pnpm install` — ran inside the job holding the OIDC `id-token: write` grant, where a compromised dependency executing at publish time could mint a token and publish a poisoned tarball via trusted publishing (which binds repo+workflow, not step). The gate job now packs the exact tarball it validated and hands it over as an artifact; the privileged job only downloads and publishes those bytes — publishing a tarball file runs no package lifecycle scripts, so no build tooling executes beside the token

## 1.0.2 (2026-04-07)

* Fixed: `pointerup` `preventDefault` is now gated on mouse input only, restoring touch interaction
* Dropped `svelte-preprocess`; pinned `typescript` to `^5.9.3` and bumped the `svelte` peer range
* Updated dependencies

## 1.0.0 (2026-02-16)

* First stable release of the fork
* Refactored `Select.svelte` into composables (`use-value`, `use-hover`, `use-load-options`, `keyboard-navigation`, `aria-handlers`) and improved ARIA handling and type safety
* Fixed clearing behavior when using `justValue`, with new tests and `load-dependencies` examples
* Migrated the codebase from JavaScript to TypeScript
* Added a Tailwind stylesheet (`svelte-5-select/tailwind.css`)
* Updated all dependencies

## 1.0.0-beta
* Forked from [kodaicoder/svelte-5-select](https://github.com/kodaicoder/svelte-5-select), which was forked from [rob-balfre/svelte-select](https://github.com/rob-balfre/svelte-select)
* Updated dependencies and associated code to Typescript

## 5.8.3

* #651 Fixed: unknown extension .svelte (thanks to @happysalada)

## 5.8.2

* #658 Fixed ARIA + vite-plugin-svelte warnings (thanks to @stephenlrandall)

## 5.8.0

* #626 added clearFilterTextOnBlur prop (thanks to @mBoegvald)
* #644 Fixed input focus issue (thanks to @524c)

## 5.7.0

* #617 added custom group title border variable support (thanks to @lipe-dev)
* #610 resolved ARIA warnings by defining a role on interactive divs (thanks to @josdejong)

## 5.6.2

* #525 set clear button to `type="button"` (thanks to @CanRau)
  
## 5.6.1

* #525 set clear button to `type="button"` (thanks to @CanRau)


## 5.6.0

* #579 added named slot `input-hidden` (thanks to @Ennoriel)

## 5.5.3

* #578 `required` `tabindex` fix (thanks to @Ennoriel)

## 5.5.2

* #570 `on:blur` bug fix (thanks to @cyaris)

## 5.5.1

* npm will be the death of me...

## 5.5.0

* #564 added named slots `list-prepend` and `list-append` (thanks to @sawyerclick)

## 5.4.0

* #561 added some needed CSS custom properties, `--max-height`,`--value-container-overflow`,`--value-container-padding`, `--indicators-position`, `--indicators-top`, `--indicators-right`, `--indicators-bottom` (thanks to @Edward-Heales)

## 5.3.1

* Reverted a dep bump for `@sveltejs/package` - has a breaking change for non-kit setups. Will bake into v6 instead.

## 5.3.0

* Added prop `closeListOnChange`
* Fixes for #548, #549, #551 and #554

## 5.2.1

* #544 Fix for `--border-radius` and `--border-radius-focused` fallbacks (thanks to @schibrikov)
* Added example for style props

## 5.2.0

* #541 Added CSS custom property `--border-radius-focused` (thanks to @schibrikov)
* Added example for create item when `multiple` is `true`

## 5.1.4

* #534 fix for Select's TypeScript declaration file (thanks to @hughlaw)
* #535 fix for icons touch events (thanks to @miXwui)

## 5.1.3

* #523 fix for hoverItemIndex becoming -1 (thanks to @geminway92)

## 5.1.2 

* #520 fix for autoUpdate and floating UI when list is above select (thanks to @aureleoules)

## 5.1.1 

* `.list-item` and safari fix for tailwind (thanks to @sawyerclick)

## 5.1.0

* #513 `on:clear` event now includes item data for single selects too (thanks to @libklein)
* `floatingConfig` default now includes `autoUpdate: true`
* Added `--item-transition`

## 5.0.2

* #509 Fix null error when using loadOptions and value (thanks to @dlebech)


## 5.0.1

* #459 Firefox pointerdown fix (thanks to @mikekok)

## 5.0.0

* Added hoverItemIndex and hoverItem event
* Default font-size set to `16px`, iOS will zoom the UI if set smaller (thanks to @rchrdnsh)
* Added `--border-hover`, `--border-focused`, `--item-height`, `--item-line-height` and `--multi-item-color`
* Removed `--borderFocusColor` and `--borderHoverColor`
* Remove `getSelectionLabel` use slots instead
* Added `floatingConfig` 
* Removed `listPlacement`
* Removed `computePlacement` 
* Removed CSS prop `--input-font-size`
* Removed CSS prop `--multi-item-border`
* Removed CSS prop `--multi-label-margin`
* Added CSS props `--loading--margin , --loading-color, --loading-height, --loading-width`
* Added CSS prop `--chevron-border`
* Added CSS prop `--font-size`
* Added CSS prop `--multi-item-gap`
* Added named slot `multi-clear-icon`
* Added named slot `list`
* Added named slot `item`
* Removed Virtual list
* noOptionsMessage removed
* optionIdentifier -> itemId
* getOptionLabel removed
* getGroupHeaderLabel removed
* itemCreated event removed
* labelIdentifier -> label
* creatable removed, use named slots and bake in your create own logic
* isGroupHeaderSelectable -> groupHeaderSelectable
* isSearchable -> searchable
* isFocused -> focused
* isCreatable -> creatable
* isClearable -> clearable
* isWaiting -> loading
* Added named slot `prepend`
* Added named slot `chevron`
* Added named slot `clear-icon`
* Added named slot `loading-icon`
* Removed iconProps
* Removed ClearIcon component
* Removed ChevronIcon component
* Removed MultiSelection component
* Added named slot `selection`
* Removed Selection component
* isMulti -> multiple
* Other improvements (see docs)
* select-container -> svelte-select
* added justValue
* Placeholder default change from 'Select...' to 'Please select'
* added blur and focus events
* removed isOutOfViewport and clickOutside
* new debounce method
* filterMethod changed to filter
* added support for svelte-tiny-virtual-list
* removed virtual-list class and css props
* loadOptionsInterval -> debounceWait
* selectedValue removed
* MultiSelection removed
* added postcss to example, tests
* tailwind css option
* breaking: containerClasses -> class
* listGroupTitle -> list-group-title
* listContainer -> list 
* selectContainer and other CSS class names updated, selectContainer -> svelte-select for example
* LoadingIcon prop added
* CSS props updates. Added .icons and removed some css vars
* Removed logic to show chevron if isSearchable is false
* indicator class renamed to chevron 
* showIndicator renamed showChevron
* indicatorSvg removed, use ChevronIcon going forward
* removed playwright and puppeteer, tests now just run in the browser with sirv
* debounce method is now exported as a prop
* Convert repo to use SvelteKit
* Change licence from LIL to ISC

# 4.4.7

Temp fix for SvelteKit and scrollbar issues - thanks to @sethvincent

# 4.4.6

Bug fix for isOutOfViewport - thanks to @alexkuzmin

## 4.4.5

* NPM blunder (sorry!)

## 4.4.4

* Bug fix for #346 out of viewport - thanks to @nickyrferry

## 4.4.3

* listOffset was missing from typings - thanks to @blake-regalia

## 4.4.2

* Bug fix for #309 - thanks to @ABarnob

## 4.4.1

* Added missing prop 'placeholderAlwaysShow' to TypeScript declaration file (#305) - thanks to @paolotiu

## 4.4.0

* Added support for non-selectable items - thanks to @mpdaugherty 

## 4.3.1

* TextFilter bug fix (#291)

## 4.3.0

* Added A11y support (#286) - thanks to @fedoskina
* Added id prop

## 4.2.7

* Bug fixes for #278, #279, #280, #285 - thanks to @davidfou 

## 4.2.6

* TypeScript declaration in package.json (#277) - thanks to @davidfou

## 4.2.5

* multiple on:select fix (#276)

## 4.2.4

* CreateGroupHeaderItem fix (#275)

## 4.2.3

* Filtering refactor (#274)

## 4.2.2

* Bug fix for filtering items (#274)

## 4.2.1

* Bug fix to remove focus when an external field is focused programmatically - thanks to @davidfou

## 4.2.0

* Added listOffset prop
* Added CSS custom props '--listRight' and '--listLeft'

## 4.1.0

* Added labelIdentifier prop - thanks to @martgnz

## 4.0.0

* selectedValue deprecated please use value going forward
* Lots of bug fixes
* Internals reworked and (hopefully) improved
* File size reduced

## 3.17.0

* Added ClearIcon prop
* Added docs for filteredItems
* loadOptions res now checked for cancelled value

## 3.16.1

* Bug fix for loadOptions and list causing blur to not close list - thanks to @Ginfone for reporting

## 3.16.0

* New CSS custom props '--placeholderOpacity' and 'disabledPlaceholderOpacity' added - thanks to @tiaanduplessis

## 3.15.0

* Added new prop multiFullItemClearable for easier clearable items when multiple is true - thanks to @stephenlrandall

## 3.14.3

* Regression fix for 3.14.2 clearing selectedValue if not found in items - thanks to @frederikhors for reporting

## 3.14.2

* Fix so selectedValue updates on items change - thanks to @stephenlrandall

## 3.14.1

* Fix input attributes so the defaults can be overwritten

## 3.14.0

* Added event 'loaded' when loadOptions resolves - thanks to @singingwolfboy

## 3.13.0

* Added TypeScript declaration file - thanks to @singingwolfboy

## 3.12.0

* new event 'error' is dispatched on caught errors
* loadOptions now catches errors
* new CSS custom prop '--errorBackground' added
* CSS fix for long multi items wrapping text

## 3.11.1

* Fix to prevent multiple updates on focus events - thanks to @stephenlrandall

## 3.11.0

* README reformatted
* iconProps added for Icon component - thanks to @stephenlrandall

## 3.10.1

* Fix for noOptionsMessage not updating when changed - thanks to @frederikhors

## 3.10.0

* Added indicatorSvg prop - thanks to @oharsta (again!)

## 3.9.0

* Added showIndicator prop - thanks to @oharsta

## 3.8.1

* Fix for containerClasses repeating

## 3.8.0

* Added containerClasses prop - thanks to @0xCAP

## 3.7.2

* Fix for loadOptions with items opening list by default

## 3.7.1

* Fix for groupHeader selection on enter - thanks to @KiwiJuicer

## 3.7.0

* Added new CSS vars for groupTitleFontWeight, groupItemPaddingLeft and itemColor - thanks to @john-trieu-nguyen

## 3.6.2

* CSS vars padding default fix

## 3.6.1

* CSS vars typo fix

## 3.6.0

* Added CSS vars for input padding and left

## 3.5.0

* Added Icon and showChevron props

## 3.4.0

* Bumped version of Svelte to 3.19.1 and fixed up some tests

## 3.3.7

* Virtual list height fix

## 3.3.6

*  Thanks for @jpz for this update... Fix input blurring issue when within shadow DOM

## 3.3.5

*  MS Edge fix: Replaced object literal spreading

## 3.3.4

*  Fix for fix for a fix for IE11 disable input fix 😿

## 3.3.3

*  Fix for a fix for IE11 disable input fix (don't code tired!)

## 3.3.2

*  IE11 disable input fix

## 3.3.0

*  Thanks to @jackc for this update... Added itemFilter method

## 3.2.0

*  List will now close if active item gets selected

## 3.1.2

*  Thanks to @dimfeld for these updates...
*  Removing unused properties from List.svelte
*  Fix handling of console message type "warning"

## 3.1.1

*  README updated for Sapper SSR

## 3.1.0

*  added prop listAutoWidth - List width will grow wider than the Select container (depending on list item content length)
*  README updated

## 3.0.2

*  selectedValue that are strings now look-up and set correct value
*  README / demo updates

## 3.0.1

*  Item created bug fix
*  Virtual list scroll fix

## 3.0.0

*  Breaking change: isCreatable refactor
*  getCreateLabel has been removed
*  If using isCreatable and custom list or item components would need to implement filterText prop

## 2.1.0

*  CSS vars for theme control
*  Clear event improved for multi-select support
*  Grouping improvements
*  Svelte v3 upgrade bug fixes

## 2.0.3

*  allow html content in multi selection

## 2.0.2

*  CSS height bug fix
*  Fix for Async loading (again)

## 2.0.1

*  Nothing, just npm being weird!

## 2.0.0

*  Upgrade to Svelte v3
*  Added isCreatable

## 1.7.6

*  Fix for Async loading
*  Security patch

## 1.7.5

*  Disabled colour values updated


## 1.7.4

*  Fix for destroy method

## 1.7.3

*  Fix for isOutOfViewport.js import typo


## 1.7.2

*  Moved svelte-virtual-list into source

## 1.7.1

*  Fix for svelte-virtual-list

## 1.7.0

*  Multi-select bug fixes
*  Added hasError prop and styles
*  Added isVirtualList prop (Experimental)

## 1.6.0

*  Added menuPlacement

## 1.5.5

*  multiple on:select bug fix

## 1.5.4

*  Set background default to #fff
*  Only fire select event when a new item is selected

## 1.5.3

* Removed unused class causing warnings
* README typo

## 1.5.2

* Reset highlighted item index to 0 when list updates or filters

## 1.5.1

* Fix for npm publish missing a file

## 1.5.0

* Added events for select and clear
* Updated README
* Added tests

## 1.4.0

* Added hideEmptyState
* Updated README
* Added tests

## 1.3.0

* Updated README
* Updated filtering with loadOptions
* LeftArrow and RightArrow now remove highlight from list items
* Added tests
* Updated examples

## 1.2.0

* Updated README
* Added Async (loadOptions)
* Added noOptionsMessage
* Bug fixes
* Updated examples

## 1.1.0

* Updated README
* Added Multi-select
* Added Grouping
* IE11 support

## 1.0.0

* First release
