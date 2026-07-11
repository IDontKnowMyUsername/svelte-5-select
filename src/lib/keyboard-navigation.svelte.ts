import type { KeyboardNavigationActions, KeyboardNavigationState, SelectItem } from './types';
import { areItemsEqual, getItemProperty, isItemSelectableCheck } from '$lib/utils';

export function useKeyboardNavigation<Item extends SelectItem = SelectItem>(
    state: KeyboardNavigationState<Item>,
    actions: KeyboardNavigationActions,
) {
    // Handlers claim an event (preventDefault/stopPropagation) only on branches
    // that actually act on it. Unclaimed keys keep bubbling so ancestors still
    // see them — Escape can close a surrounding dialog, Enter can submit a form.
    // Claimed keys must stop propagation so the component's window listener does
    // not handle the same bubbled event a second time.
    function handleKeyDown(e: KeyboardEvent): void {
        if (!state.focused) return;

        const handlers: Record<string, (e: KeyboardEvent) => void> = {
            Escape: handleEscapeKey,
            Enter: handleEnterKey,
            ArrowDown: handleArrowDownKey,
            ArrowUp: handleArrowUpKey,
            Tab: handleTabKey,
            Backspace: handleBackspaceKey,
            ArrowLeft: handleArrowLeftKey,
            ArrowRight: handleArrowRightKey,
            Home: handleHomeKey,
            End: handleEndKey,
        };

        const handler = handlers[e.key];
        if (handler) {
            handler(e);
            return;
        }

        handleTypeAheadKey(e);
    }

    // Type-ahead for select-only mode (APG combobox pattern): the input is
    // readonly when searchable is false, so printable characters move hover to
    // the next option whose label starts with what was typed. Searchable
    // selects filter by typing instead and never enter this path.
    let typeAheadQuery = '';
    let typeAheadLastKeyTime = 0;
    const TYPE_AHEAD_RESET_MS = 700;

    function handleTypeAheadKey(e: KeyboardEvent): void {
        if (state.searchable) return;
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === ' ' && typeAheadQuery === '') return; // a bare Space is not a query

        e.preventDefault();
        e.stopPropagation();

        // Event timestamps instead of a reset timer: nothing to clean up on destroy
        if (e.timeStamp - typeAheadLastKeyTime > TYPE_AHEAD_RESET_MS) typeAheadQuery = '';
        typeAheadLastKeyTime = e.timeStamp;
        typeAheadQuery += e.key.toLowerCase();

        if (!state.listOpen) {
            state.listOpen = true;
            state.activeValue = undefined;
        }

        const { filteredItems, hoverItemIndex, label } = state;
        if (filteredItems.length === 0) return;

        // Repeating one character cycles through the options with that initial;
        // a growing query refines the match starting from the current option
        const isSameCharRun =
            typeAheadQuery.length > 1 && typeAheadQuery.split('').every((ch) => ch === typeAheadQuery[0]);
        const query = isSameCharRun ? typeAheadQuery[0] : typeAheadQuery;
        const startOffset = isSameCharRun || typeAheadQuery.length === 1 ? 1 : 0;

        for (let step = 0; step < filteredItems.length; step++) {
            const i = (hoverItemIndex + startOffset + step) % filteredItems.length;
            const item = filteredItems[i];
            if (!isItemSelectableCheck(item)) continue;
            const itemLabel = String(getItemProperty(item, label) ?? '').toLowerCase();
            if (itemLabel.startsWith(query)) {
                state.hoverItemIndex = i;
                return;
            }
        }
    }

    function handleEscapeKey(e: KeyboardEvent): void {
        if (!state.listOpen) return;

        e.preventDefault();
        e.stopPropagation();
        actions.closeList();
    }

    function handleEnterKey(e: KeyboardEvent): void {
        const { listOpen, filteredItems, hoverItemIndex, value, multiple, itemId } = state;

        if (!listOpen) return;

        e.preventDefault();
        e.stopPropagation();

        if (filteredItems.length === 0) return;

        const hoverItem = filteredItems[hoverItemIndex];

        if (!multiple && areItemsEqual(value as SelectItem | null, hoverItem, itemId)) {
            actions.closeList();
        } else {
            actions.handleSelect(filteredItems[hoverItemIndex]);
        }
    }

    function handleArrowDownKey(e: KeyboardEvent): void {
        e.preventDefault();
        e.stopPropagation();

        if (state.listOpen) {
            actions.setHoverIndex(1);
        } else {
            state.listOpen = true;
            state.activeValue = undefined;
        }
    }

    function handleArrowUpKey(e: KeyboardEvent): void {
        e.preventDefault();
        e.stopPropagation();

        if (state.listOpen) {
            actions.setHoverIndex(-1);
        } else {
            state.listOpen = true;
            state.activeValue = undefined;
        }
    }

    function handleTabKey(e: KeyboardEvent): void {
        const { listOpen, focused, filteredItems, hoverItemIndex, value, itemId } = state;

        if (!listOpen || !focused) return;

        // Tab keeps bubbling in both branches: focus traps and other ancestor
        // handlers must still see it. Re-entry via the window listener is safe
        // because the list is closed by then.
        if (
            filteredItems.length === 0 ||
            areItemsEqual(value as SelectItem | null, filteredItems[hoverItemIndex], itemId)
        ) {
            actions.closeList();
            return;
        }

        e.preventDefault();
        actions.handleSelect(filteredItems[hoverItemIndex]);
        actions.closeList();
    }

    function handleBackspaceKey(e: KeyboardEvent): void {
        const { multiple, filterText, value, activeValue } = state;

        if (!multiple || filterText.length > 0) return;

        if (Array.isArray(value) && value.length > 0) {
            e.stopPropagation();
            const indexToRemove = activeValue !== undefined ? activeValue : value.length - 1;
            actions.handleMultiItemClear(indexToRemove);

            if (activeValue === 0 || activeValue === undefined) return;

            const newActiveValue = value.length > activeValue ? activeValue - 1 : undefined;
            state.activeValue = newActiveValue;
        }
    }

    function handleArrowLeftKey(e: KeyboardEvent): void {
        const { value, multiple, filterText, activeValue } = state;

        if (!value || !multiple || filterText.length > 0) return;

        if (Array.isArray(value)) {
            e.stopPropagation();
            if (activeValue === undefined) {
                state.activeValue = value.length - 1;
            } else if (value.length > activeValue && activeValue !== 0) {
                state.activeValue = activeValue - 1;
            }
        }
    }

    // Home/End only take over list navigation while no filter text is
    // entered, so text-caret movement in the input keeps working
    function handleHomeKey(e: KeyboardEvent): void {
        const { listOpen, filteredItems, filterText } = state;

        if (!listOpen || filterText.length > 0) return;

        e.preventDefault();
        e.stopPropagation();
        const firstSelectable = filteredItems.findIndex((item) => isItemSelectableCheck(item));
        if (firstSelectable >= 0) state.hoverItemIndex = firstSelectable;
    }

    function handleEndKey(e: KeyboardEvent): void {
        const { listOpen, filteredItems, filterText } = state;

        if (!listOpen || filterText.length > 0) return;

        e.preventDefault();
        e.stopPropagation();
        for (let i = filteredItems.length - 1; i >= 0; i--) {
            if (isItemSelectableCheck(filteredItems[i])) {
                state.hoverItemIndex = i;
                return;
            }
        }
    }

    function handleArrowRightKey(e: KeyboardEvent): void {
        const { value, multiple, filterText, activeValue } = state;

        if (!value || !multiple || filterText.length > 0 || activeValue === undefined) return;
        if (!Array.isArray(value)) return;

        e.stopPropagation();
        if (activeValue === value.length - 1) {
            state.activeValue = undefined;
        } else if (activeValue < value.length - 1) {
            state.activeValue = activeValue + 1;
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
        handleHomeKey,
        handleEndKey,
    };
}
