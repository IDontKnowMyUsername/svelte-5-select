import type { HoverContext, SelectItem } from './types';
import { areItemsEqual, isItemSelectableCheck } from './utils';

export function useHover(context: HoverContext) {

    function computeNextIndex(filteredItems: SelectItem[], fromIndex: number, increment: number): number {
        let selectableFilteredItems = filteredItems.filter(
            (item) => !Object.hasOwn(item, 'selectable') || item.selectable === true,
        );

        if (selectableFilteredItems.length === 0) {
            return 0;
        }

        const currentItem = filteredItems[fromIndex];
        const isCurrentSelectable = isItemSelectableCheck(currentItem);

        let currentSelectableIndex;

        if (isCurrentSelectable) {
            currentSelectableIndex = selectableFilteredItems.findIndex(item => item === currentItem);
        } else {
            currentSelectableIndex = increment > 0 ? -1 : selectableFilteredItems.length;
        }

        let newSelectableIndex;
        if (increment > 0) {
            newSelectableIndex = (currentSelectableIndex + 1) % selectableFilteredItems.length;
        } else {
            newSelectableIndex = (currentSelectableIndex - 1 + selectableFilteredItems.length) % selectableFilteredItems.length;
        }

        const newItem = selectableFilteredItems[newSelectableIndex];
        return filteredItems.findIndex(item => item === newItem);
    }

    function setHoverIndex(increment: number) {
        const { filteredItems, hoverItemIndex } = context.getState();
        context.setHoverItemIndex(computeNextIndex(filteredItems, hoverItemIndex, increment));
    }

    function setValueIndexAsHoverIndex() {
        const { value, filteredItems, itemId } = context.getState();
        const normalizedValue = !value ? null : typeof value === 'string' ? { value, label: value } : value;

        if (!normalizedValue || Array.isArray(normalizedValue)) return;

        const singleValue: SelectItem = normalizedValue;

        const valueIndex = filteredItems.findIndex((i: SelectItem) => {
            return (i as Record<string, any>)[itemId] === (singleValue as Record<string, any>)[itemId];
        });

        checkHoverSelectable(valueIndex, true);
    }

    function checkHoverSelectable(startingIndex = 0, ignoreGroup?: boolean) {
        const { groupBy, filteredItems } = context.getState();
        const idx = startingIndex < 0 ? 0 : startingIndex;

        if (!ignoreGroup && groupBy && filteredItems[idx] && !filteredItems[idx].selectable) {
            // Compute the final index without intermediate state writes
            context.setHoverItemIndex(computeNextIndex(filteredItems, idx, 1));
        } else {
            context.setHoverItemIndex(idx);
        }
    }

    function getFirstSelectableIndex(): number {
        const { groupBy, filteredItems } = context.getState();
        if (!groupBy || filteredItems.length === 0) return 0;

        if (!isItemSelectableCheck(filteredItems[0])) {
            const firstSelectable = filteredItems.findIndex(isItemSelectableCheck);
            return firstSelectable >= 0 ? firstSelectable : 0;
        }

        return 0;
    }

    function isItemActive(item: SelectItem, val: SelectItem | SelectItem[] | null | undefined, itemId: string): boolean | undefined {
        const { multiple } = context.getState();
        if (multiple) return;
        const normalized = !val ? null : typeof val === 'string' ? { value: val, label: val } : val;
        return areItemsEqual(normalized, item, itemId);
    }

    function isItemSelectable(item: SelectItem) {
        return (item.groupHeader && item.selectable) || isItemSelectableCheck(item);
    }

    function handleHover(i: number): void {
        const { isScrolling } = context.getState();
        if (isScrolling) return;
        context.setHoverItemIndex(i);
    }

    function handleListScroll() {
        context.setIsScrolling(true);
    }

    function handleListScrollEnd() {
        context.setIsScrolling(false);
    }

    return {
        computeNextIndex,
        setHoverIndex,
        setValueIndexAsHoverIndex,
        checkHoverSelectable,
        getFirstSelectableIndex,
        isItemActive,
        isItemSelectable,
        handleHover,
        handleListScroll,
        handleListScrollEnd,
    };
}
