import type { Snippet } from 'svelte';
import type { ComputePositionConfig } from 'svelte-floating-ui/dom';

export type SelectValue = SelectItem | SelectItem[] | null;

export interface ErrorEvent {
    type: string;
    details: unknown;
}

export interface FilterConfig {
    loadOptions?: (filterText: string) => Promise<SelectItem[] | string[]>;
    filterText: string;
    items: SelectItem[] | string[] | null;
    multiple: boolean;
    value: SelectItem | SelectItem[] | null | undefined;
    itemId: string;
    groupBy?: (item: SelectItem) => string | undefined;
    label: string;
    filterSelectedItems: boolean;
    itemFilter: (label: string, filterText: string, option: SelectItem) => boolean;
    convertStringItemsToObjects: (items: string[]) => SelectItem[];
    filterGroupedItems: (items: SelectItem[]) => SelectItem[];
}

export interface FloatingConfig extends Partial<ComputePositionConfig> {
    autoUpdate?: boolean;
}

export interface KeyboardNavigationContext {
    // Getters for current state
    getState: () => {
        listOpen: boolean;
        filteredItems: SelectItem[];
        hoverItemIndex: number;
        multiple: boolean;
        value: SelectProps['value'];
        filterText: string;
        activeValue: number | undefined;
        itemId: string;
        focused: boolean;
    };

    // Setters for state updates
    setListOpen: (value: boolean) => void;
    setHoverItemIndex: (value: number) => void;
    setActiveValue: (value: number | undefined) => void;

    // Action callbacks
    closeList: () => void;
    setHoverIndex: (increment: number) => void;
    handleSelect: (item: SelectItem) => void;
    handleMultiItemClear: (index: number) => Promise<void>;
}

export interface HoverContext {
    getState: () => {
        listOpen: boolean;
        filteredItems: SelectItem[];
        hoverItemIndex: number;
        multiple: boolean;
        value: SelectProps['value'];
        isScrolling: boolean;
        groupBy: ((item: SelectItem) => string) | undefined;
        itemId: string;
    };
    setHoverItemIndex: (value: number) => void;
    setIsScrolling: (value: boolean) => void;
    onhoveritem: (index: number) => void;
}

export type JustValue = string | number | string[] | number[] | null;

export interface ValueContext {
    getState: () => {
        value: SelectProps['value'];
        prevValue: SelectProps['value'];
        items: SelectItem[] | string[] | null;
        multiple: boolean;
        itemId: string;
        label: string;
        hasValue: boolean;
        normalizedValue: SelectItem | SelectItem[] | null;
        useJustValue: boolean;
        justValue: JustValue | undefined;
        clearState: boolean;
        closeListOnChange: boolean;
    };
    setValue: (value: SelectProps['value']) => void;
    setJustValue: (value: JustValue) => void;
    setPrevValue: (value: SelectProps['value']) => void;
    setClearState: (value: boolean) => void;
    setActiveValue: (value: number | undefined) => void;
    setFilterText: (value: string) => void;
    closeList: () => void;
    oninput: (value: SelectProps['value']) => void;
    onchange: (value: SelectProps['value']) => void;
    onclear: (value: SelectProps['value'] | SelectItem) => void;
    onselect: (selection: SelectItem) => void;
}

export interface LoadOptionsContext {
    getState: () => {
        filterText: string;
        prevFilterText: string | undefined;
        loadOptionsDeps: any[];
        loadOptions: ((filterText: string) => Promise<SelectItem[] | string[]>) | undefined;
        disabled: boolean;
        multiple: boolean;
        value: SelectProps['value'];
        items: SelectItem[] | string[] | null;
        itemId: string;
        useJustValue: boolean;
        justValue: JustValue | undefined;
        listOpen: boolean;
        debounceWait: number;
    };
    setItems: (items: SelectItem[] | string[] | null) => void;
    setValue: (value: SelectProps['value']) => void;
    setJustValue: (value: JustValue) => void;
    setLoading: (value: boolean) => void;
    setListOpen: (value: boolean) => void;
    debounce: (fn: () => void, wait: number) => void;
    convertStringItemsToObjects: (items: string[]) => SelectItem[];
    onloaded: (options: SelectItem[]) => void;
    onerror: (error: ErrorEvent) => void;
}

export interface ScrollActionParams {
    scroll: boolean;
}

export interface SelectItem {
    value?: any;
    label?: string;
    index?: number;
    group?: string;
    groupHeader?: boolean;
    groupItem?: boolean;
    selectable?: boolean;
    id?: string | number;
    [key: string]: any;
}

export interface SelectProps {
    // Core data props
    filterText?: string;
    itemId?: string;
    items?: SelectItem[] | string[] | null;
    justValue?: JustValue;
    label?: string;
    value?: SelectItem | SelectItem[] | string | null;

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
    multiple?: boolean;
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
    inputAttributes?: Record<string, any>;
    listAutoWidth?: boolean;
    listOffset?: number;
    loadOptionsDeps?: any[];

    // Function props
    createGroupHeaderItem?: (groupValue: string, item: SelectItem) => SelectItem;
    debounce?: (fn: () => void, wait: number) => void;
    filter?: (config: FilterConfig) => SelectItem[];
    getFilteredItems?: () => SelectItem[];
    groupBy?: ((item: SelectItem) => string) | undefined;
    groupFilter?: (groups: string[]) => string[];
    itemFilter?: (label: string, filterText: string, option: SelectItem) => boolean;
    loadOptions?: (filterText: string) => Promise<SelectItem[] | string[]>;

    // ARIA props
    ariaFocused?: () => string;
    ariaLabel?: string;
    ariaListOpen?: (label: string, count: number) => string;
    ariaValues?: (values: string) => string;

    // Custom behavior
    handleClear?: () => void;

    // Event handlers
    onblur?: (e: FocusEvent) => void;
    onchange?: (value: SelectValue) => void;
    onclear?: (value: SelectValue) => void;
    onerror?: (error: ErrorEvent) => void;
    onfilter?: (items: SelectItem[]) => void;
    onfocus?: (e: FocusEvent) => void;
    onhoveritem?: (index: number) => void;
    oninput?: (value: SelectValue) => void;
    onloaded?: (options: SelectItem[]) => void;
    onselect?: (selection: SelectItem) => void;

    // Snippet props
    chevronIconSnippet?: Snippet<[boolean]>;
    clearIconSnippet?: Snippet;
    emptySnippet?: Snippet;
    inputHiddenSnippet?: Snippet<[SelectValue]>;
    itemSnippet?: Snippet<[SelectItem, number]>;
    listAppendSnippet?: Snippet;
    listPrependSnippet?: Snippet;
    listSnippet?: Snippet<[SelectItem[]]>;
    loadingIconSnippet?: Snippet;
    multiClearIconSnippet?: Snippet;
    prependSnippet?: Snippet;
    requiredSnippet?: Snippet<[SelectValue]>;
    selectionSnippet?: Snippet<[SelectItem | SelectItem[], number?]>;

    // DOM references (for binding)
    container?: HTMLDivElement;
    input?: HTMLInputElement;
}