import { untrack } from 'svelte';
import type { ItemLike, SelectItem, SelectState } from './types';
import { areItemsEqual, getItemProperty, isItemSelectableCheck, normalizeItem } from './utils';

export function useHover<Item extends ItemLike = SelectItem>(state: SelectState<Item>) {
    function computeNextIndex(filteredItems: SelectItem[], fromIndex: number, increment: number): number {
        // Same predicate as click/Enter selection: arrow keys must be able to
        // reach every item the user can otherwise select
        const selectableFilteredItems = filteredItems.filter((item) => isItemSelectableCheck(item));

        if (selectableFilteredItems.length === 0) {
            return 0;
        }

        const currentItem = filteredItems[fromIndex];
        const isCurrentSelectable = isItemSelectableCheck(currentItem);

        let currentSelectableIndex;

        if (isCurrentSelectable) {
            currentSelectableIndex = selectableFilteredItems.findIndex((item) => item === currentItem);
        } else {
            currentSelectableIndex = increment > 0 ? -1 : selectableFilteredItems.length;
        }

        let newSelectableIndex;
        if (increment > 0) {
            newSelectableIndex = (currentSelectableIndex + 1) % selectableFilteredItems.length;
        } else {
            newSelectableIndex =
                (currentSelectableIndex - 1 + selectableFilteredItems.length) % selectableFilteredItems.length;
        }

        const newItem = selectableFilteredItems[newSelectableIndex];
        return filteredItems.findIndex((item) => item === newItem);
    }

    function setHoverIndex(increment: number) {
        const { filteredItems, hoverItemIndex } = state;
        state.hoverItemIndex = computeNextIndex(filteredItems, hoverItemIndex, increment);
    }

    function setValueIndexAsHoverIndex() {
        const { normalizedValue, filteredItems, itemId } = state;
        if (!normalizedValue || Array.isArray(normalizedValue)) return;

        const valueIndex = filteredItems.findIndex(
            (item) => getItemProperty(item, itemId) === getItemProperty(normalizedValue, itemId),
        );

        checkHoverSelectable(valueIndex, true);
    }

    function checkHoverSelectable(startingIndex = 0, ignoreGroup?: boolean) {
        const { groupBy, filteredItems } = state;
        const idx = startingIndex < 0 ? 0 : startingIndex;

        if (!ignoreGroup && groupBy && filteredItems[idx] && !filteredItems[idx].selectable) {
            // Compute the final index without intermediate state writes
            state.hoverItemIndex = computeNextIndex(filteredItems, idx, 1);
        } else {
            state.hoverItemIndex = idx;
        }
    }

    function getFirstSelectableIndex(): number {
        const { groupBy, filteredItems } = state;
        if (!groupBy || filteredItems.length === 0) return 0;

        if (!isItemSelectableCheck(filteredItems[0])) {
            const firstSelectable = filteredItems.findIndex(isItemSelectableCheck);
            return firstSelectable >= 0 ? firstSelectable : 0;
        }

        return 0;
    }

    function isItemActive(item: SelectItem): boolean {
        const { multiple, normalizedValue, itemId } = state;
        if (multiple) {
            if (!Array.isArray(normalizedValue)) return false;
            // Array entries may still be raw strings; normalize each before comparing
            return normalizedValue.some((v) => areItemsEqual(normalizeItem(v as SelectItem | string), item, itemId));
        }
        if (Array.isArray(normalizedValue)) return false;
        return areItemsEqual(normalizedValue, item, itemId);
    }

    function isItemSelectable(item: SelectItem) {
        return (item.groupHeader && item.selectable) || isItemSelectableCheck(item);
    }

    function handleHover(i: number): void {
        if (state.isScrolling) return;
        state.hoverItemIndex = i;
    }

    let scrollEndFallback: ReturnType<typeof setTimeout> | undefined;

    function handleListScroll() {
        state.isScrolling = true;
        // scrollend never fires on some browsers (e.g. Safari < 18.2); without a
        // fallback a single scroll would wedge isScrolling and kill hover + blur
        clearTimeout(scrollEndFallback);
        scrollEndFallback = setTimeout(() => {
            state.isScrolling = false;
        }, 150);
    }

    function handleListScrollEnd() {
        clearTimeout(scrollEndFallback);
        state.isScrolling = false;
    }

    // Teardown-only effect (not onDestroy: composables are also created inside
    // $effect.root in tests, where onDestroy has no component context)
    $effect(() => {
        return () => clearTimeout(scrollEndFallback);
    });

    // Set value index as hover when list opens
    $effect(() => {
        if (!state.multiple && state.listOpen && state.value && state.filteredItems) {
            untrack(() => setValueIndexAsHoverIndex());
        }
    });

    // Keep hover on a selectable item
    $effect(() => {
        state.filteredItems;
        state.value;
        state.multiple;
        state.listOpen;
        untrack(() => {
            if (state.listOpen && state.filteredItems.length > 0) {
                if (!isItemSelectableCheck(state.filteredItems[state.hoverItemIndex])) {
                    checkHoverSelectable();
                } else if (state.groupBy && state.hoverItemIndex === 0) {
                    checkHoverSelectable();
                }
            }
        });
    });

    // Reset hover to the first selectable item on filterText change
    $effect(() => {
        if (state.filterText) {
            untrack(() => {
                state.hoverItemIndex = getFirstSelectableIndex();
            });
        }
    });

    return {
        setHoverIndex,
        isItemActive,
        isItemSelectable,
        handleHover,
        handleListScroll,
        handleListScrollEnd,
    };
}
