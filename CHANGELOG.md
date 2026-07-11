# svelte-5-select changelog

## Unreleased

### ⚠ Breaking changes

* Composable API reworked around a shared reactive state store: `useKeyboardNavigation` now takes `(state: KeyboardNavigationState, actions)`; `KeyboardNavigationContext` and `isCancelled` were removed
* `loadOptions` is no longer re-run when the list opens or closes — it fires on typing (non-empty filter text), `loadOptionsDeps` changes, and mount; closing the list never triggers a fetch
* A filter-driven `loadOptions` result no longer clears a selection that is missing from the narrowed results; only dependency-driven reloads (`loadOptionsDeps`) validate and clear stale values
* Enter and Escape pass through when the list is closed, so implicit form submission and dialog-close keep working; keys only stop propagation when the component actually handles them
* Group headers no longer render `role="group"`/`aria-label` — an element with `role="option"`/`role="presentation"` may not contain a group, and the group wrapped only the header text
* Removed the vestigial `build:lib` script and `vite.lib.config.ts` (a Svelte-4-era bundle build that clobbered `dist/`); `npm run package` is the library build

### Fixed

* List could not be closed (and refetched on every attempt) with `loadOptions` + `clearFilterTextOnBlur={false}`
* Selecting an item in an async select fired a spurious `loadOptions('')` and showed the loading spinner on the closed control
* Multiple string values collapsed to a single entry when items were not yet resolvable (dedup keyed every raw string on `undefined`); multi-mode fallback normalization also respects a custom `itemId` now
* Keyboard navigation scrolls the hovered option into view again (`block: 'nearest'`), and opening the list scrolls to the selected option — lost in the composable refactor
* Custom `floatingConfig` (e.g. `placement`) was silently reverted by svelte-floating-ui's deferred recompute right after mount; overrides now merge into the config object the library holds a reference to
* `isScrolling` no longer wedges hover and blur permanently on browsers without `scrollend` (e.g. Safari < 18.2); a 150 ms fallback clears it
* Removed the provably no-op window click handler; outside clicks keep closing the list via the input's native blur

### Tests

* New real-browser layout suite (`pnpm run test:browser`, vitest browser mode + Playwright) asserting floating placement, `listOffset`, list width, and scroll-into-view geometry; the corresponding happy-dom tests were vacuous (no layout engine) and were removed or rewritten as `scrollIntoView` spies

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
