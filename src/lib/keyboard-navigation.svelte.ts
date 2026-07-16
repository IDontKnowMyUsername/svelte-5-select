import type { ItemLike, KeyboardNavigationActions, KeyboardNavigationState, SelectItem } from './types';
import { areItemsEqual, getItemProperty, isItemSelectableCheck } from '$lib/utils';

export function useKeyboardNavigation<Item extends ItemLike = SelectItem>(
    state: KeyboardNavigationState<Item>,
    actions: KeyboardNavigationActions,
) {
    // Handlers claim an event (preventDefault/stopPropagation) only on branches
    // that actually act on it. Unclaimed keys keep bubbling so ancestors still
    // see them — Escape can close a surrounding dialog, Enter can submit a form.
    // Claimed keys must stop propagation so the component's window listener does
    // not handle the same bubbled event a second time.
    function handleKeyDown(e: KeyboardEvent): void {
        // The disabled gate is defence in depth: disabling releases focus, but
        // `focused` can lag DOM focus (e.g. the deferred-blur window), and a
        // disabled control must never mutate its value from the keyboard.
        if (!state.focused || state.disabled) return;

        const handlers: Record<string, (e: KeyboardEvent) => void> = {
            Escape: handleEscapeKey,
            Enter: handleEnterKey,
            ' ': handleSpaceKey,
            ArrowDown: handleArrowDownKey,
            ArrowUp: handleArrowUpKey,
            Tab: handleTabKey,
            Backspace: handleBackspaceKey,
            ArrowLeft: handleArrowLeftKey,
            ArrowRight: handleArrowRightKey,
            Home: handleHomeKey,
            End: handleEndKey,
            PageUp: handlePageUpKey,
            PageDown: handlePageDownKey,
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

    // Space has combobox semantics (open, then select the current option) only in
    // select-only mode. In a searchable/editable combobox it is an ordinary
    // character for the filter text, so we leave it entirely alone there.
    function handleSpaceKey(e: KeyboardEvent): void {
        if (state.searchable) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // While a type-ahead query is still live, Space belongs to it so labels
        // that contain spaces ("New York") stay reachable by typing.
        const typeAheadLive = typeAheadQuery !== '' && e.timeStamp - typeAheadLastKeyTime <= TYPE_AHEAD_RESET_MS;
        if (typeAheadLive) {
            handleTypeAheadKey(e);
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (!state.listOpen) {
            state.listOpen = true;
            state.activeValue = undefined;
            return;
        }

        // List open: behave like Enter — select the current option, or close if it
        // is already the (single) selected value.
        const { filteredItems, hoverItemIndex, value, multiple, itemId } = state;
        if (filteredItems.length === 0) return;

        const hoverItem = filteredItems[hoverItemIndex];
        if (!multiple && areItemsEqual(value as SelectItem | null, hoverItem, itemId)) {
            actions.closeList();
        } else {
            actions.handleSelect(hoverItem);
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

        // APG: Alt+Down opens the list without moving the visual cursor.
        if (e.altKey) {
            if (!state.listOpen) {
                state.listOpen = true;
                state.activeValue = undefined;
            }
            return;
        }

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

        // APG: Alt+Up closes the list without changing the selection.
        if (e.altKey) {
            if (state.listOpen) actions.closeList();
            return;
        }

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

        // Tab is never claimed: committing must close the popup and move focus in
        // the same press (APG), so no preventDefault, and the event keeps bubbling
        // for focus traps and ancestor handlers. Re-entry via the window listener
        // is safe because the list is closed by then.
        if (
            e.shiftKey || // Tabbing backwards leaves the field; it must never commit
            filteredItems.length === 0 ||
            areItemsEqual(value as SelectItem | null, filteredItems[hoverItemIndex], itemId)
        ) {
            actions.closeList();
            return;
        }

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

    // PageUp/PageDown jump the hover by a page of selectable options, clamped to
    // the first/last selectable (no wrap, unlike the Arrow keys). They stay active
    // while filtering: PageUp/PageDown do not move the caret in a single-line
    // input, so there is nothing to conflict with the way Home/End would.
    const PAGE_SIZE = 10;

    function pageHover(direction: 1 | -1): boolean {
        const { listOpen, filteredItems } = state;
        if (!listOpen) return false;

        const selectable: number[] = [];
        for (let i = 0; i < filteredItems.length; i++) {
            if (isItemSelectableCheck(filteredItems[i])) selectable.push(i);
        }
        if (selectable.length === 0) return false;

        // Where the current hover sits among selectable rows; if it is parked on a
        // non-selectable header, anchor just outside so a full page still moves.
        let pos = selectable.indexOf(state.hoverItemIndex);
        if (pos === -1) pos = direction > 0 ? -1 : selectable.length;

        const targetPos = Math.min(selectable.length - 1, Math.max(0, pos + direction * PAGE_SIZE));
        state.hoverItemIndex = selectable[targetPos];
        return true;
    }

    function handlePageDownKey(e: KeyboardEvent): void {
        if (!pageHover(1)) return;
        e.preventDefault();
        e.stopPropagation();
    }

    function handlePageUpKey(e: KeyboardEvent): void {
        if (!pageHover(-1)) return;
        e.preventDefault();
        e.stopPropagation();
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
        handleSpaceKey,
        handleArrowDownKey,
        handleArrowUpKey,
        handleTabKey,
        handleBackspaceKey,
        handleArrowLeftKey,
        handleArrowRightKey,
        handleHomeKey,
        handleEndKey,
        handlePageUpKey,
        handlePageDownKey,
    };
}
