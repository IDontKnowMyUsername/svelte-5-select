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

    function checkHoverSelectable(startingIndex = 0, trustIndex?: boolean) {
        const { filteredItems } = state;
        const idx = startingIndex < 0 ? 0 : startingIndex;

        // Same predicate as click/Enter selection (a missing `selectable` key
        // means selectable), and not gated on groupBy: a plain list can start
        // with a non-selectable item too
        if (!trustIndex && filteredItems[idx] && !isItemSelectableCheck(filteredItems[idx])) {
            // Compute the final index without intermediate state writes
            state.hoverItemIndex = computeNextIndex(filteredItems, idx, 1);
        } else {
            state.hoverItemIndex = idx;
        }
    }

    function getFirstSelectableIndex(): number {
        const { filteredItems } = state;
        if (filteredItems.length === 0) return 0;

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
        // Deliberately NOT commit-intent for Tab: browsers synthesize mouseover
        // when the list renders under a stationary cursor, so hover alone can
        // happen with zero user action. Intent comes from real pointer movement
        // over the open list (the list's mousemove handler in Select.svelte).
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
        const shouldSnap = !state.multiple && state.listOpen && !!state.value && !!state.filteredItems;
        untrack(() => {
            // One-shot: a type-ahead keypress that opened the list has already
            // parked hover on its match — snapping to the value would clobber
            // it. Consume the flag on every run so it can never go stale.
            const suppressed = state.suppressValueHoverSnap;
            state.suppressValueHoverSnap = false;
            if (shouldSnap && !suppressed) setValueIndexAsHoverIndex();
        });
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
