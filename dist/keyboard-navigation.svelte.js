import { areItemsEqual } from './utils';
export function useKeyboardNavigation(context) {
    function handleKeyDown(e) {
        e.stopPropagation();
        const { focused } = context.getState();
        if (!focused)
            return;
        const handlers = {
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
    function handleEscapeKey(e) {
        e.preventDefault();
        context.closeList();
    }
    function handleEnterKey(e) {
        e.preventDefault();
        const { listOpen, filteredItems, hoverItemIndex, value, multiple, itemId } = context.getState();
        if (!listOpen)
            return;
        if (filteredItems.length === 0)
            return;
        const hoverItem = filteredItems[hoverItemIndex];
        if (!multiple && areItemsEqual(value, hoverItem, itemId)) {
            context.closeList();
        }
        else {
            context.handleSelect(filteredItems[hoverItemIndex]);
        }
    }
    function handleArrowDownKey(e) {
        e.preventDefault();
        const { listOpen } = context.getState();
        if (listOpen) {
            context.setHoverIndex(1);
        }
        else {
            context.setListOpen(true);
            context.setActiveValue(undefined);
        }
    }
    function handleArrowUpKey(e) {
        e.preventDefault();
        const { listOpen } = context.getState();
        if (listOpen) {
            context.setHoverIndex(-1);
        }
        else {
            context.setListOpen(true);
            context.setActiveValue(undefined);
        }
    }
    function handleTabKey(e) {
        const { listOpen, focused, filteredItems, hoverItemIndex, value, itemId } = context.getState();
        if (!listOpen || !focused)
            return;
        if (filteredItems.length === 0 || areItemsEqual(value, filteredItems[hoverItemIndex], itemId)) {
            context.closeList();
            return;
        }
        e.preventDefault();
        context.handleSelect(filteredItems[hoverItemIndex]);
        context.closeList();
    }
    function handleBackspaceKey(e) {
        const { multiple, filterText, value, activeValue } = context.getState();
        if (!multiple || filterText.length > 0)
            return;
        if (multiple && value && value.length > 0) {
            const indexToRemove = activeValue !== undefined ? activeValue : value.length - 1;
            context.handleMultiItemClear(indexToRemove);
            if (activeValue === 0 || activeValue === undefined)
                return;
            const newActiveValue = value.length > activeValue ? activeValue - 1 : undefined;
            context.setActiveValue(newActiveValue);
        }
    }
    function handleArrowLeftKey(e) {
        const { value, multiple, filterText, activeValue } = context.getState();
        if (!value || !multiple || filterText.length > 0)
            return;
        if (Array.isArray(value)) {
            if (activeValue === undefined) {
                context.setActiveValue(value.length - 1);
            }
            else if (value.length > activeValue && activeValue !== 0) {
                context.setActiveValue(activeValue - 1);
            }
        }
    }
    function handleArrowRightKey(e) {
        const { value, multiple, filterText, activeValue } = context.getState();
        if (!value || !multiple || filterText.length > 0 || activeValue === undefined)
            return;
        if (activeValue === value.length - 1) {
            context.setActiveValue(undefined);
        }
        else if (activeValue < value.length - 1) {
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
