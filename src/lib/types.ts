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
 */
export type SelectValueProp<
    Item extends ItemLike = SelectItem,
    Multiple extends boolean = boolean,
> = Multiple extends true ? Item[] | string[] | null : Item | string | null;

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
    filterGroupedItems: (items: SelectItem[]) => SelectItem[];
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
    filterText?: string;
    itemId?: string;
    items?: Item[] | string[] | null;
    justValue?: JustValue;
    label?: string;
    value?: SelectValueProp<Item, Multiple>;

    // UI props
    disabled?: boolean;
    focused?: boolean;
    hasError?: boolean;
    hideEmptyState?: boolean;
    id?: string | null;
    listOpen?: boolean;
    loading?: boolean;
    name?: string | null;
    placeholder?: string;
    placeholderAlwaysShow?: boolean;
    showChevron?: boolean;

    // Behavior props
    clearable?: boolean;
    clearFilterTextOnBlur?: boolean;
    closeListOnChange?: boolean;
    filterSelectedItems?: boolean;
    groupHeaderSelectable?: boolean;
    multiFullItemClearable?: boolean;
    multiple?: Multiple;
    required?: boolean;
    searchable?: boolean;
    useJustValue?: boolean;

    // Styling props
    class?: string;
    containerStyles?: string;
    inputStyles?: string;
    listStyle?: string;

    // Advanced props
    debounceWait?: number;
    floatingConfig?: FloatingConfig;
    hoverItemIndex?: number;
    inputAttributes?: HTMLInputAttributes;
    listAutoWidth?: boolean;
    listOffset?: number;
    loadOptionsDeps?: unknown[];

    // Function props
    createGroupHeaderItem?: (groupValue: string, item: Item) => SelectItem;
    debounce?: (fn: () => void, wait: number) => void;
    filter?: (config: FilterConfig<Item>) => SelectItem[];
    groupBy?: ((item: Item) => string) | undefined;
    groupFilter?: (groups: string[]) => string[];
    itemFilter?: (label: string, filterText: string, option: Item) => boolean;
    loadOptions?: (filterText: string) => Promise<Item[] | string[]>;

    // ARIA props
    ariaCleared?: () => string;
    /** `aria-label` for the clear-all button. */
    ariaClearSelectLabel?: string;
    ariaEmpty?: () => string;
    /** id of an external element describing the error; wired to `aria-errormessage` only while `hasError` is true. */
    ariaErrorMessage?: string;
    ariaFocused?: () => string;
    ariaLabel?: string;
    ariaListOpen?: (label: string, count: number) => string;
    ariaLoading?: () => string;
    /** `aria-label` for each multi-select tag's remove button; receives the item's label. */
    ariaRemoveItemLabel?: (label: string) => string;
    ariaValues?: (values: string) => string;

    // Custom behavior
    handleClear?: (e?: MouseEvent) => void;

    // Event handlers
    onblur?: (e: FocusEvent) => void;
    onchange?: (value: SelectValue<Item, Multiple>) => void;
    /** Clear-all receives the full removed value; removing one tag receives that single entry. */
    onclear?: (value: SelectClearValue<Item, Multiple>) => void;
    onerror?: (error: SelectErrorEvent) => void;
    onfilter?: (items: Item[]) => void;
    onfocus?: (e: FocusEvent) => void;
    onhoveritem?: (index: number) => void;
    oninput?: (value: SelectValue<Item, Multiple>) => void;
    onloaded?: (options: Item[]) => void;
    onselect?: (selection: Item) => void;

    // Snippet props
    chevronIconSnippet?: Snippet<[boolean]>;
    clearIconSnippet?: Snippet;
    emptySnippet?: Snippet;
    inputHiddenSnippet?: Snippet<[SelectValueProp<Item, Multiple> | undefined]>;
    itemSnippet?: Snippet<[Item, number]>;
    listAppendSnippet?: Snippet;
    listPrependSnippet?: Snippet;
    listSnippet?: Snippet<[Item[]]>;
    loadingIconSnippet?: Snippet;
    multiClearIconSnippet?: Snippet;
    prependSnippet?: Snippet;
    requiredSnippet?: Snippet<[SelectValueProp<Item, Multiple> | undefined]>;
    /** Receives one item at a time: the value in single mode, each tag in multiple mode. */
    selectionSnippet?: Snippet<[Item, number?]>;

    // DOM references (for binding)
    container?: HTMLDivElement;
    input?: HTMLInputElement;
}
