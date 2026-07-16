import type { ItemLike, SelectItem, SelectState } from './types';

/**
 * The prop-backed part of the store: Select.svelte supplies live getter/setter
 * accessors over its `$props()` bindings and derived values, so reads stay
 * reactive and writes flow back into the bound props.
 */
export type SelectStateProps<Item extends ItemLike = SelectItem> = Omit<
    SelectState<Item>,
    'activeValue' | 'isScrolling' | 'clearState' | 'prevValue' | 'prevFilterText' | 'prevMultiple'
>;

/**
 * Builds the single shared state object passed to every composable (in place of
 * the former per-composable getState()/setter bundles). Internal shared state
 * lives here; prop-backed fields are forwarded to the accessors from Select.svelte.
 * Per-field access means a read tracks only that one signal, so composables no
 * longer create blanket reactive dependencies on all state at once.
 */
export function createSelectState<Item extends ItemLike = SelectItem>(
    props: SelectStateProps<Item>,
): SelectState<Item> {
    let activeValue = $state<number | undefined>(undefined);
    let isScrolling = $state(false);
    let clearState = $state(false);

    // Comparison scratch fields, only read inside untrack()ed code — deliberately non-reactive.
    // prevValue is seeded with the initial value so mount does not dispatch oninput;
    // prevFilterText is seeded so an initial filterText does not open the list (and
    // steal focus through the list-open effect) on mount.
    let prevValue: SelectState<Item>['prevValue'] = props.value;
    let prevFilterText: string | undefined = props.filterText;
    let prevMultiple: boolean | undefined = undefined;

    return {
        get value() {
            return props.value;
        },
        set value(v) {
            props.value = v;
        },
        get items() {
            return props.items;
        },
        set items(v) {
            props.items = v;
        },
        get filterText() {
            return props.filterText;
        },
        set filterText(v) {
            props.filterText = v;
        },
        get justValue() {
            return props.justValue;
        },
        set justValue(v) {
            props.justValue = v;
        },
        get listOpen() {
            return props.listOpen;
        },
        set listOpen(v) {
            props.listOpen = v;
        },
        get loading() {
            return props.loading;
        },
        set loading(v) {
            props.loading = v;
        },
        get focused() {
            return props.focused;
        },
        set focused(v) {
            props.focused = v;
        },
        get hoverItemIndex() {
            return props.hoverItemIndex;
        },
        set hoverItemIndex(v) {
            props.hoverItemIndex = v;
        },

        get multiple() {
            return props.multiple;
        },
        get itemId() {
            return props.itemId;
        },
        get label() {
            return props.label;
        },
        get searchable() {
            return props.searchable;
        },
        get disabled() {
            return props.disabled;
        },
        get useJustValue() {
            return props.useJustValue;
        },
        get closeListOnChange() {
            return props.closeListOnChange;
        },
        get debounceWait() {
            return props.debounceWait;
        },
        get groupBy() {
            return props.groupBy;
        },
        get loadOptions() {
            return props.loadOptions;
        },
        get loadOptionsDeps() {
            return props.loadOptionsDeps;
        },

        get filteredItems() {
            return props.filteredItems;
        },
        get normalizedValue() {
            return props.normalizedValue;
        },
        get hasValue() {
            return props.hasValue;
        },

        get activeValue() {
            return activeValue;
        },
        set activeValue(v) {
            activeValue = v;
        },
        get isScrolling() {
            return isScrolling;
        },
        set isScrolling(v) {
            isScrolling = v;
        },
        get clearState() {
            return clearState;
        },
        set clearState(v) {
            clearState = v;
        },
        get prevValue() {
            return prevValue;
        },
        set prevValue(v) {
            prevValue = v;
        },
        get prevFilterText() {
            return prevFilterText;
        },
        set prevFilterText(v) {
            prevFilterText = v;
        },
        get prevMultiple() {
            return prevMultiple;
        },
        set prevMultiple(v) {
            prevMultiple = v;
        },
    };
}
