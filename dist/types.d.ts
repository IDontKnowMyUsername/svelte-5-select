import type { Snippet } from 'svelte';
import type { ComputePositionConfig } from 'svelte-floating-ui/dom';
export interface ErrorEvent {
    type: string;
    details: any;
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
    getState: () => {
        listOpen: boolean;
        filteredItems: SelectItem[];
        hoverItemIndex: number;
        multiple: boolean;
        value: any;
        filterText: string;
        activeValue: number | undefined;
        itemId: string;
        focused: boolean;
    };
    setListOpen: (value: boolean) => void;
    setHoverItemIndex: (value: number) => void;
    setActiveValue: (value: number | undefined) => void;
    closeList: () => void;
    setHoverIndex: (increment: number) => void;
    handleSelect: (item: SelectItem) => void;
    handleMultiItemClear: (index: number) => Promise<void>;
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
    filterText?: string;
    itemId?: string;
    items?: SelectItem[] | string[] | null;
    justValue?: any;
    label?: string;
    value?: SelectItem | SelectItem[] | string | null;
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
    class?: string;
    containerStyles?: string;
    inputStyles?: string;
    listStyle?: string;
    debounceWait?: number;
    floatingConfig?: FloatingConfig;
    hoverItemIndex?: number;
    inputAttributes?: Record<string, any>;
    listAutoWidth?: boolean;
    listOffset?: number;
    loadOptionsDeps?: any[];
    createGroupHeaderItem?: (groupValue: string, item: SelectItem) => SelectItem;
    debounce?: (fn: () => void, wait: number) => void;
    filter?: (config: FilterConfig) => SelectItem[];
    getFilteredItems?: () => SelectItem[];
    groupBy?: ((item: SelectItem) => string) | undefined;
    groupFilter?: (groups: string[]) => string[];
    itemFilter?: (label: string, filterText: string, option: any) => boolean;
    loadOptions?: (filterText: string) => Promise<SelectItem[] | string[]>;
    ariaFocused?: () => string;
    ariaListOpen?: (label: string, count: number) => string;
    ariaValues?: (values: string) => string;
    handleClear?: () => void;
    onblur?: (e: FocusEvent) => void;
    onchange?: (value: any) => void;
    onclear?: (value: any) => void;
    onerror?: (error: ErrorEvent) => void;
    onfilter?: (items: SelectItem[]) => void;
    onfocus?: (e: FocusEvent) => void;
    onhoveritem?: (index: number) => void;
    oninput?: (value: any) => void;
    onloaded?: (options: SelectItem[]) => void;
    onselect?: (selection: SelectItem) => void;
    chevronIconSnippet?: Snippet<[boolean]>;
    clearIconSnippet?: Snippet;
    emptySnippet?: Snippet;
    inputHiddenSnippet?: Snippet<[any]>;
    itemSnippet?: Snippet<[SelectItem, number]>;
    listAppendSnippet?: Snippet;
    listPrependSnippet?: Snippet;
    listSnippet?: Snippet<[SelectItem[]]>;
    loadingIconSnippet?: Snippet;
    multiClearIconSnippet?: Snippet;
    prependSnippet?: Snippet;
    requiredSnippet?: Snippet<[any]>;
    selectionSnippet?: Snippet<[any, number?]>;
    container?: HTMLDivElement;
    input?: HTMLInputElement;
}
