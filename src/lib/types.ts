import type { Snippet } from 'svelte';
import type { HTMLInputAttributes } from 'svelte/elements';
import type { ComputePositionConfig } from 'svelte-floating-ui/dom';

/**
 * The bound for user item types. Deliberately `Record<string, any>` rather than
 * {@link SelectItem}: interface-declared item types have no implicit index
 * signature, so they satisfy this bound but not `SelectItem` itself.
 */
export type ItemLike = Record<string, any>;

/**
 * The payload shape of `oninput`/`onchange`: an item array in multiple mode,
 * a single item or null otherwise. `Multiple` defaults to `boolean`, which
 * distributes to the loose `Item[] | Item | null` union.
 */
export type SelectValue<Item extends ItemLike = SelectItem, Multiple extends boolean = boolean> = Multiple extends true
    ? Item[]
    : Item | null;

/**
 * The bindable `value` prop shape: raw string ids are also accepted and are
 * normalized into items against `items`.
 *
 * The component always *writes* `undefined` for an empty selection — in both single
 * and multiple mode, and on every clear path (the clear button, removing the last
 * tag, a `loadOptionsDeps` reload invalidating the value, a multiple→single switch).
 * `null` is accepted on the way in, so an existing `bind:value` initialized to `null`
 * keeps working; read an emptied value as falsy rather than testing `=== null`.
 * (The `oninput`/`onchange` payload is a separate contract — see {@link SelectValue} —
 * and reports `null` in single mode and `[]` in multiple mode.)
 */
export type SelectValueProp<
    Item extends ItemLike = SelectItem,
    Multiple extends boolean = boolean,
> = Multiple extends true ? Item[] | string[] | null | undefined : Item | string | null | undefined;

/**
 * The payload of `onclear`. Clearing the whole selection passes the full removed
 * value (an `Item[]` in multiple mode); removing a single tag in multiple mode
 * passes just that removed entry. Discriminated by `Multiple` so single mode never
 * has to account for an array, and one-tag removal is only in the multiple branch.
 * Raw string ids are included because `value` accepts them.
 */
export type SelectClearValue<
    Item extends ItemLike = SelectItem,
    Multiple extends boolean = boolean,
> = Multiple extends true ? Item[] | string[] | Item | string | null : Item | string | null;

export interface SelectErrorEvent {
    type: string;
    details: unknown;
}

/** @deprecated Renamed to {@link SelectErrorEvent} — this alias shadows the DOM's global `ErrorEvent`. */
export type ErrorEvent = SelectErrorEvent;

export interface FilterConfig<Item extends ItemLike = SelectItem> {
    loadOptions?: (filterText: string) => Promise<Item[] | string[]>;
    filterText: string;
    items: Item[] | string[] | null;
    multiple: boolean;
    value: SelectItem | SelectItem[] | null | undefined;
    itemId: string;
    groupBy?: (item: Item) => string;
    label: string;
    filterSelectedItems: boolean;
    itemFilter: (label: string, filterText: string, option: Item) => boolean;
    convertStringItemsToObjects: (items: string[]) => SelectItem[];
    /**
     * Transforms the flat filtered list into a grouped one (inserting headers and
     * applying the `groupBy`/`groupFilter` props). Distinct from the `groupFilter`
     * prop, which only reorders/filters the group keys this transform consumes.
     */
    applyGrouping: (items: SelectItem[]) => SelectItem[];
}

export interface FloatingConfig extends Partial<ComputePositionConfig> {
    autoUpdate?: boolean;
}

export type JustValue = string | number | string[] | number[] | null;

export interface SelectItem {
    value?: unknown;
    label?: string;
    index?: number;
    group?: string;
    groupHeader?: boolean;
    groupItem?: boolean;
    selectable?: boolean;
    id?: string | number;
    [key: string]: unknown;
}

/**
 * A group header row synthesized by `groupBy` and injected into the rendered list.
 * It is not one of your items — it carries the group's own value and label plus the
 * marker fields, and nothing else — so it cannot be read as an `Item`.
 */
export interface SelectGroupHeader extends SelectItem {
    groupHeader: true;
    selectable: boolean;
}

/**
 * A row of the rendered list. With `groupBy` set the list interleaves your items with
 * synthesized {@link SelectGroupHeader} rows, so everything that reads the rendered
 * list — `getFilteredItems()`, `onfilter`, `listSnippet`, `itemSnippet` — sees this
 * union rather than a bare `Item`. Narrow it with {@link isGroupHeader}:
 *
 * ```svelte
 * {#snippet itemSnippet(row)}
 *     {#if isGroupHeader(row)}
 *         <strong>{row.label}</strong>
 *     {:else}
 *         {row.name} <!-- row is your Item here -->
 *     {/if}
 * {/snippet}
 * ```
 *
 * Without `groupBy` no headers are ever produced, but the type cannot know that
 * statically — the guard is a one-line narrow in that case.
 */
export type SelectRow<Item extends ItemLike = SelectItem> = Item | SelectGroupHeader;

/**
 * The single reactive state object shared by Select.svelte and its composables.
 * Prop-backed fields are live accessors over the component's `$props()` bindings;
 * the rest is internal shared state owned by `createSelectState`. Reading a field
 * tracks only that field's signal.
 */
export interface SelectState<Item extends ItemLike = SelectItem> {
    // Bindable props
    value: Item | Item[] | string | string[] | null | undefined;
    items: Item[] | string[] | null;
    filterText: string;
    justValue: JustValue | undefined;
    listOpen: boolean;
    loading: boolean;
    focused: boolean;
    hoverItemIndex: number;

    // Configuration props
    readonly multiple: boolean;
    readonly itemId: string;
    readonly label: string;
    readonly searchable: boolean;
    readonly disabled: boolean;
    readonly useJustValue: boolean;
    readonly closeListOnChange: boolean;
    readonly debounceWait: number;
    readonly groupBy: ((item: Item) => string) | undefined;
    readonly loadOptions: ((filterText: string) => Promise<Item[] | string[]>) | undefined;
    readonly loadOptionsDeps: unknown[];

    // Derived values
    readonly filteredItems: SelectItem[];
    readonly normalizedValue: SelectItem | SelectItem[] | null;
    readonly hasValue: boolean;

    // Internal shared state
    activeValue: number | undefined;
    isScrolling: boolean;
    clearState: boolean;
    prevValue: Item | Item[] | string | string[] | null | undefined;
    prevFilterText: string | undefined;
    prevMultiple: boolean | undefined;
}

/** The subset of {@link SelectState} that keyboard navigation needs; any object with these fields works. */
export interface KeyboardNavigationState<Item extends ItemLike = SelectItem> {
    listOpen: boolean;
    readonly filteredItems: SelectItem[];
    hoverItemIndex: number;
    readonly multiple: boolean;
    readonly value: Item | Item[] | string | string[] | null | undefined;
    readonly filterText: string;
    activeValue: number | undefined;
    readonly itemId: string;
    readonly label: string;
    readonly searchable: boolean;
    readonly focused: boolean;
    readonly disabled: boolean;
}

export interface KeyboardNavigationActions {
    closeList: () => void;
    setHoverIndex: (increment: number) => void;
    handleSelect: (item: SelectItem) => void;
    handleMultiItemClear: (index: number) => void | Promise<void>;
}

export interface ValueActions {
    closeList: () => void;
    oninput: (value: SelectItem | string | (SelectItem | string)[] | null | undefined) => void;
    onchange: (value: SelectItem | string | (SelectItem | string)[] | null | undefined) => void;
    onclear: (value: SelectItem | string | (SelectItem | string)[] | null | undefined) => void;
    onselect: (selection: SelectItem) => void;
}

export interface LoadOptionsActions {
    debounce: (fn: () => void, wait: number) => void;
    onloaded: (options: SelectItem[]) => void;
    onerror: (error: SelectErrorEvent) => void;
}

export interface ScrollActionParams {
    scroll: boolean;
}

export interface SelectProps<Item extends ItemLike = SelectItem, Multiple extends boolean = false> {
    // Core data props
    /**
     * Bindable. The text typed into the input; drives filtering and `loadOptions`.
     * An initial value is kept on mount and applied passively: it filters (and
     * fetches, with `loadOptions`) but does not open the list or move focus.
     * Later programmatic writes behave like typing and open the list.
     *
     * The DOM input's value is only ever this filter text — a selection is
     * rendered alongside the input (and announced via the live regions), never
     * written into the textbox. Read the selection from `value`/`justValue` or
     * the form field (`name`), not from the DOM input.
     */
    filterText?: string;
    /** Which field uniquely identifies an item. Values are compared by this field, not by reference. @default 'value' */
    itemId?: string;
    /**
     * Bindable. The options to choose from. A `string[]` is converted to
     * `{ value, label, index }` items for you. Leave unset when using `loadOptions`,
     * which populates this.
     */
    items?: Item[] | string[] | null;
    /**
     * Bindable, and only meaningful with `useJustValue`: the selection reduced to bare
     * `itemId` values (`'a'` / `['a', 'b']`) instead of whole items. Writing it while
     * no selection exists hydrates `value` — the matching items are resolved out of
     * `items`, retrying when async items arrive. While a selection exists, `justValue`
     * is derived from it and a conflicting write is corrected back: write (or clear)
     * `value` to change the selection.
     */
    justValue?: JustValue;
    /** Which field holds an item's display text. @default 'label' */
    label?: string;
    /**
     * Bindable. The current selection: an item (or `Item[]` with `multiple`), or a raw
     * string id that is normalized against `items`. Empty is always `undefined` —
     * see {@link SelectValueProp}.
     */
    value?: SelectValueProp<Item, Multiple>;

    // UI props
    /**
     * Blocks interaction: the list closes, focus is released, and typing and
     * keyboard navigation are ignored. The selection is kept — except with
     * `loadOptions`, where disabling clears `value` and `items` (loaded options
     * may be stale by re-enable). Rendered as `aria-disabled` + `readonly`
     * rather than the native `disabled` attribute, so the current value stays
     * in the accessibility tree.
     */
    disabled?: boolean;
    /**
     * Bindable. Whether the input has focus. Writable: setting `true` moves DOM
     * focus to the input, `false` blurs it and closes the list.
     */
    focused?: boolean;
    /** Applies the error styling and sets `aria-invalid`. Pair with `ariaErrorMessage`. */
    hasError?: boolean;
    /** Renders nothing instead of the "No options" row when the list is empty. */
    hideEmptyState?: boolean;
    /** The input's `id`, for an external `<label for>`. Also seeds every internal id; one is generated if unset. */
    id?: string | null;
    /** Bindable. Whether the option list is open. */
    listOpen?: boolean;
    /** Bindable. Shows the spinner and sets `aria-busy`. Managed for you while `loadOptions` is in flight. */
    loading?: boolean;
    /** Name of the hidden input, for native form submission. */
    name?: string | null;
    /** @default 'Please select' */
    placeholder?: string;
    /** Keep the placeholder visible even when an item is selected (multiple mode). */
    placeholderAlwaysShow?: boolean;
    showChevron?: boolean;

    // Behavior props
    /** Show the clear-all button. @default true */
    clearable?: boolean;
    /** Reset `filterText` when the input loses focus. @default true */
    clearFilterTextOnBlur?: boolean;
    /** Close the list after a selection. Set `false` to keep picking in multiple mode. @default true */
    closeListOnChange?: boolean;
    /** Hide already-selected items from the list. @default true */
    filterSelectedItems?: boolean;
    /** Let group headers be selected like options; otherwise they are presentational. */
    groupHeaderSelectable?: boolean;
    /** Clicking anywhere on a tag removes it, and the whole tag becomes a keyboard tab stop. */
    multiFullItemClearable?: boolean;
    /**
     * Allow several selections, rendered as tags. Drives typing: with `multiple`,
     * `value` and the `oninput`/`onchange` payloads narrow to `Item[]`.
     */
    multiple?: Multiple;
    /** Block native form submission while nothing is selected, and set `aria-required`. */
    required?: boolean;
    /** Allow typing to filter. When `false` the input is read-only and printable keys jump to matching options. @default true */
    searchable?: boolean;
    /** Mirror the selection into `justValue` as bare ids, and hydrate `value` from it on mount. */
    useJustValue?: boolean;

    // Styling props
    /** Extra class(es) on the container, alongside `svelte-select`. */
    class?: string;
    /** Inline styles on the container. */
    containerStyles?: string;
    /** Inline styles on the text input. */
    inputStyles?: string;
    /** Inline styles on the option list. */
    listStyle?: string;

    // Advanced props
    /** How long typing settles before `loadOptions` fires, in ms. Only typing is debounced. @default 300 */
    debounceWait?: number;
    /** Passed to floating-ui to position the list (placement, middleware, autoUpdate). */
    floatingConfig?: FloatingConfig;
    /** Bindable. Index of the option under the keyboard cursor. */
    hoverItemIndex?: number;
    /** Extra attributes for the text input. Merged over the component's own ARIA wiring, so it can override it. */
    inputAttributes?: HTMLInputAttributes;
    /** Size the list to the container's width. @default true */
    listAutoWidth?: boolean;
    /** Gap between the container and the list, in px. @default 5 */
    listOffset?: number;
    /**
     * Values that `loadOptions` depends on (e.g. a parent select's value). When any of
     * them changes, options are re-fetched immediately (no debounce) and the current
     * selection is validated against the result: entries a non-empty result no longer
     * offers are dropped (the whole value clears to `undefined` only when nothing
     * survives). An empty result is treated as no evidence and never clears — a search
     * endpoint returns nothing for the retained (usually empty) filter text regardless
     * of the selection. Typing-driven loads never invalidate the selection this way.
     */
    loadOptionsDeps?: unknown[];

    // Function props
    /** Builds the header row for a group; receives the group's value and its first item. */
    createGroupHeaderItem?: (groupValue: string, item: Item) => SelectItem;
    /** Replace the debounce strategy used for typing-driven `loadOptions` calls. */
    debounce?: (fn: () => void, wait: number) => void;
    /** Replace the whole filtering pipeline. Most cases only need `itemFilter`. */
    filter?: (config: FilterConfig<Item>) => SelectItem[];
    /**
     * Returns the group an item belongs to. Setting this makes the list interleave
     * synthesized header rows with your items — see {@link SelectRow}.
     */
    groupBy?: ((item: Item) => string) | undefined;
    /** Reorders or filters the group keys produced by `groupBy`. */
    groupFilter?: (groups: string[]) => string[];
    /** Decides whether one option survives the current `filterText`. Not applied to `loadOptions` results. */
    itemFilter?: (label: string, filterText: string, option: Item) => boolean;
    /**
     * Fetches options asynchronously. Runs on mount, on typing (debounced by
     * `debounceWait`), and whenever `loadOptionsDeps` or `disabled` changes.
     * Opening or closing the list never fetches, with one exception: reopening
     * with retained filter text whose load was cancelled on close (e.g. with
     * `clearFilterTextOnBlur={false}`) refreshes the stale results immediately.
     * Whatever it returns is what the list shows: results are not re-filtered by
     * `filterText`. Set `items` or this, not both.
     */
    loadOptions?: (filterText: string) => Promise<Item[] | string[]>;

    // ARIA props
    /** Announced when the selection is cleared. */
    ariaCleared?: () => string;
    /** `aria-label` for the clear-all button. */
    ariaClearSelectLabel?: string;
    /** Announced when an open list has no results. */
    ariaEmpty?: () => string;
    /** id of an external element describing the error; wired to `aria-errormessage` only while `hasError` is true. */
    ariaErrorMessage?: string;
    /** Announced when the input is focused with the list closed. */
    ariaFocused?: () => string;
    /**
     * Accessible name for the input. Prefer an external `<label for={id}>`; this
     * overrides it. With neither, the placeholder is a last-resort fallback that some
     * screen readers ignore, and a dev-only warning fires.
     */
    ariaLabel?: string;
    /**
     * Announced when the list opens and when filtering changes the result count — not
     * on every arrow key, since `aria-activedescendant` already announces each option
     * as the cursor reaches it. Receives the focused option's label and the count.
     */
    ariaListOpen?: (label: string, count: number) => string;
    /** Announced while an open list is still fetching options. */
    ariaLoading?: () => string;
    /** `aria-label` for each multi-select tag's remove button; receives the item's label. */
    ariaRemoveItemLabel?: (label: string) => string;
    /** Announced when the selection changes; receives the selected labels, comma-joined. */
    ariaValues?: (values: string) => string;

    // Custom behavior
    /**
     * Replaces the clear button's behavior entirely — the default clear (emptying
     * `value`, firing `onclear`, closing the list, refocusing the input) does not run,
     * so an override owns all of it. To merely observe a clear, use `onclear`.
     */
    handleClear?: (e?: MouseEvent) => void;

    // Event handlers
    onblur?: (e: FocusEvent) => void;
    /**
     * Fires only when the user picks an option from the list — never on a clear, a
     * programmatic `bind:value` write, or a `loadOptionsDeps` invalidation. Use
     * {@link SelectProps.oninput} to observe every value change instead.
     */
    onchange?: (value: SelectValue<Item, Multiple>) => void;
    /** Clear-all receives the full removed value; removing one tag receives that single entry. */
    onclear?: (value: SelectClearValue<Item, Multiple>) => void;
    /** Fires when a `loadOptions` promise rejects. */
    onerror?: (error: SelectErrorEvent) => void;
    /**
     * Fires with the rendered list whenever it changes while open. Rows include any
     * synthesized group headers — narrow with `isGroupHeader`.
     */
    onfilter?: (items: SelectRow<Item>[]) => void;
    onfocus?: (e: FocusEvent) => void;
    /** Fires with the index of the option under the keyboard/mouse cursor. */
    onhoveritem?: (index: number) => void;
    /**
     * Fires on *every* value change — a user selection, a clear, a programmatic
     * `bind:value` write, or a `loadOptionsDeps` invalidation. Contrast
     * {@link SelectProps.onchange}, which only fires for a user selection. An emptied
     * value arrives here as `null` (single) or `[]` (multiple), which is the one place
     * those shapes appear — `bind:value` itself always empties to `undefined`.
     */
    oninput?: (value: SelectValue<Item, Multiple>) => void;
    /** Fires with the options a `loadOptions` call resolved. */
    onloaded?: (options: Item[]) => void;
    /**
     * Fires alongside {@link SelectProps.onchange} when the user picks an option, but
     * receives just the item selected rather than the whole value.
     */
    onselect?: (selection: Item) => void;

    // Snippet props
    chevronIconSnippet?: Snippet<[boolean]>;
    clearIconSnippet?: Snippet;
    emptySnippet?: Snippet;
    inputHiddenSnippet?: Snippet<[SelectValueProp<Item, Multiple> | undefined]>;
    /**
     * Renders one row of the list. Also renders synthesized group headers when
     * `groupBy` is set — narrow with `isGroupHeader`.
     */
    itemSnippet?: Snippet<[SelectRow<Item>, number]>;
    listAppendSnippet?: Snippet;
    listPrependSnippet?: Snippet;
    /**
     * Replaces the entire list body. Rows include any synthesized group headers —
     * narrow with `isGroupHeader`.
     *
     * Note: taking over rendering means `aria-activedescendant` can no longer resolve
     * to an option, so give each rendered option `id="listbox-{id}-item-{index}"` and
     * `role="option"` to keep the combobox navigable by screen readers.
     */
    listSnippet?: Snippet<[SelectRow<Item>[]]>;
    loadingIconSnippet?: Snippet;
    multiClearIconSnippet?: Snippet;
    prependSnippet?: Snippet;
    requiredSnippet?: Snippet<[SelectValueProp<Item, Multiple> | undefined]>;
    /** Receives one item at a time: the value in single mode, each tag in multiple mode. */
    selectionSnippet?: Snippet<[Item, number?]>;

    // DOM references (for binding)
    /** Bindable, read-only: the container element, once mounted. */
    container?: HTMLDivElement;
    /** Bindable, read-only: the text input element, once mounted. */
    input?: HTMLInputElement;
}
