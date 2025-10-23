import type { KeyboardNavigationContext, SelectItem } from './types';
import { areItemsEqual } from '$lib/utils';

export function useKeyboardNavigation(context: KeyboardNavigationContext) {
    function handleKeyDown(e: KeyboardEvent): void {
        e.stopPropagation();

        const { focused } = context.getState();
        if (!focused) return;

        const handlers: Record<string, (e: KeyboardEvent) => void> = {
            'Escape': handleEscapeKey,
            'Enter': handleEnterKey,
            'ArrowDown': handleArrowDownKey,
            'ArrowUp': handleArrowUpKey,
            'Tab': handleTabKey,
            'Backspace': handleBackspaceKey,
            'ArrowLeft': handleArrowLeftKey,
            'ArrowRight': handleArrowRightKey,
        };

        const handler = handlers[e.key];
        if (handler) {
            handler(e);
        }
    }

    function handleEscapeKey(e: KeyboardEvent): void {
        e.preventDefault();
        context.closeList();
    }

    function handleEnterKey(e: KeyboardEvent): void {
        e.preventDefault();

        const { listOpen, filteredItems, hoverItemIndex, value, multiple, itemId } = context.getState();

        if (!listOpen) return;
        if (filteredItems.length === 0) return;

        const hoverItem = filteredItems[hoverItemIndex];

        if (!multiple && areItemsEqual(value, hoverItem, itemId)) {
            context.closeList();
        } else {
            context.handleSelect(filteredItems[hoverItemIndex]);
        }
    }

    function handleArrowDownKey(e: KeyboardEvent): void {
        e.preventDefault();

        const { listOpen } = context.getState();

        if (listOpen) {
            context.setHoverIndex(1);
        } else {
            context.setListOpen(true);
            context.setActiveValue(undefined);
        }
    }

    function handleArrowUpKey(e: KeyboardEvent): void {
        e.preventDefault();

        const { listOpen } = context.getState();

        if (listOpen) {
            context.setHoverIndex(-1);
        } else {
            context.setListOpen(true);
            context.setActiveValue(undefined);
        }
    }

    function handleTabKey(e: KeyboardEvent): void {
        const { listOpen, focused, filteredItems, hoverItemIndex, value, itemId } = context.getState();

        if (!listOpen || !focused) return;

        if (filteredItems.length === 0 || areItemsEqual(value, filteredItems[hoverItemIndex], itemId)) {
            context.closeList();
            return;
        }

        e.preventDefault();
        context.handleSelect(filteredItems[hoverItemIndex]);
        context.closeList();
    }

    function handleBackspaceKey(e: KeyboardEvent): void {
        const { multiple, filterText, value, activeValue } = context.getState();

        if (!multiple || filterText.length > 0) return;

        if (multiple && value && value.length > 0) {
            const indexToRemove = activeValue !== undefined ? activeValue : value.length - 1;
            context.handleMultiItemClear(indexToRemove);

            if (activeValue === 0 || activeValue === undefined) return;

            const newActiveValue = value.length > activeValue ? activeValue - 1 : undefined;
            context.setActiveValue(newActiveValue);
        }
    }

    function handleArrowLeftKey(e: KeyboardEvent): void {
        const { value, multiple, filterText, activeValue } = context.getState();

        if (!value || !multiple || filterText.length > 0) return;

        if (Array.isArray(value)) {
            if (activeValue === undefined) {
                context.setActiveValue(value.length - 1);
            } else if (value.length > activeValue && activeValue !== 0) {
                context.setActiveValue(activeValue - 1);
            }
        }
    }

    function handleArrowRightKey(e: KeyboardEvent): void {
        const { value, multiple, filterText, activeValue } = context.getState();

        if (!value || !multiple || filterText.length > 0 || activeValue === undefined) return;

        if (activeValue === value.length - 1) {
            context.setActiveValue(undefined);
        } else if (activeValue < value.length - 1) {
            context.setActiveValue(activeValue + 1);
        }
    }

    return {
        handleKeyDown,
        handleEscapeKey,
        handleEnterKey,
        handleArrowDownKey,
        handleArrowUpKey,
        handleTabKey,
        handleBackspaceKey,
        handleArrowLeftKey,
        handleArrowRightKey,
    };
}