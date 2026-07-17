import { describe, it, expect, vi } from 'vitest';
import { useKeyboardNavigation } from '$lib/keyboard-navigation.svelte';
import type { KeyboardNavigationState, SelectItem } from '$lib/types';

describe('useKeyboardNavigation', () => {
    // The composable writes state fields directly; a Proxy records every write so
    // tests can still distinguish "wrote the same value" from "did not write".
    function createMock(overrides: Partial<KeyboardNavigationState> = {}) {
        const writes: Partial<Record<keyof KeyboardNavigationState, unknown[]>> = {};
        const target: KeyboardNavigationState = {
            listOpen: false,
            filteredItems: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ] as SelectItem[],
            hoverItemIndex: 0,
            multiple: false,
            value: null,
            filterText: '',
            activeValue: undefined,
            itemId: 'value',
            label: 'label',
            searchable: true,
            focused: true,
            disabled: false,
            suppressValueHoverSnap: false,
            userNavigatedSinceOpen: false,
            ...overrides,
        };

        const state = new Proxy(target, {
            set(obj, prop, v) {
                (writes[prop as keyof KeyboardNavigationState] ??= []).push(v);
                return Reflect.set(obj, prop, v);
            },
        });

        const actions = {
            closeList: vi.fn(),
            setHoverIndex: vi.fn(),
            handleSelect: vi.fn(),
            handleMultiItemClear: vi.fn(),
        };

        return { state, writes, actions };
    }

    it('handles Escape key when the list is open', () => {
        const { state, actions } = createMock({ listOpen: true });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.closeList).toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('lets Escape pass through when the list is closed (dialog interop)', () => {
        const { state, actions } = createMock({ listOpen: false });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.closeList).not.toHaveBeenCalled();
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(event.stopPropagation).not.toHaveBeenCalled();
    });

    it('lets Enter pass through when the list is closed (form submit)', () => {
        const { state, actions } = createMock({ listOpen: false });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.handleSelect).not.toHaveBeenCalled();
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(event.stopPropagation).not.toHaveBeenCalled();
    });

    it('handles ArrowDown when list is closed', () => {
        const { state, writes, actions } = createMock();
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(writes.listOpen).toEqual([true]);
        expect(writes.activeValue).toEqual([undefined]);
    });

    it('handles Enter key to select item', () => {
        const { state, actions } = createMock({ listOpen: true });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.handleSelect).toHaveBeenCalledWith(state.filteredItems[0]);
    });

    it('does nothing when not focused', () => {
        const { state, actions } = createMock({ focused: false });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.handleSelect).not.toHaveBeenCalled();
        expect(actions.closeList).not.toHaveBeenCalled();
    });

    it('handles Tab key when value equals hover item', () => {
        const { state, actions } = createMock({
            listOpen: true,
            focused: true,
            value: { value: 'a', label: 'A' },
            hoverItemIndex: 0,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.closeList).toHaveBeenCalled();
        expect(actions.handleSelect).not.toHaveBeenCalled();
    });

    it('handles Tab key to select item when different from hover (after navigation)', () => {
        const { state, actions } = createMock({
            listOpen: true,
            focused: true,
            value: { value: 'b', label: 'B' },
            hoverItemIndex: 0,
            userNavigatedSinceOpen: true,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.handleSelect).toHaveBeenCalledWith(state.filteredItems[0]);
        expect(actions.closeList).toHaveBeenCalled();
        // Commit must not swallow the keystroke: Tab closes the popup and moves
        // focus in the same press, so the default action stays intact
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('Tab without navigation or filter text closes without committing', () => {
        // The cursor auto-parks on the first option the moment the list opens: a
        // bare open-then-Tab (click the control, decide against picking, tab
        // away) must not silently select that parked option.
        const { state, actions } = createMock({
            listOpen: true,
            focused: true,
            value: null,
            hoverItemIndex: 0,
            userNavigatedSinceOpen: false,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.handleSelect).not.toHaveBeenCalled();
        expect(actions.closeList).toHaveBeenCalled();
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('Tab commits on typed filter text even without cursor movement', () => {
        // Typing narrows the list to what the user asked for; single-press
        // Tab-commit on the top match is the documented behavior.
        const { state, actions } = createMock({
            listOpen: true,
            focused: true,
            value: null,
            hoverItemIndex: 0,
            filterText: 'a',
            userNavigatedSinceOpen: false,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.handleSelect).toHaveBeenCalledWith(state.filteredItems[0]);
        expect(actions.closeList).toHaveBeenCalled();
    });

    it('arrow navigation marks commit-intent for Tab', () => {
        const { state, actions } = createMock({
            listOpen: true,
            focused: true,
            value: null,
            hoverItemIndex: 0,
            userNavigatedSinceOpen: false,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(state.userNavigatedSinceOpen).toBe(true);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        handleKeyDown(event);

        expect(actions.handleSelect).toHaveBeenCalledWith(state.filteredItems[state.hoverItemIndex]);
        expect(actions.closeList).toHaveBeenCalled();
    });

    it('never commits on Shift+Tab, even when hover differs from value', () => {
        const { state, actions } = createMock({
            listOpen: true,
            focused: true,
            value: { value: 'b', label: 'B' },
            hoverItemIndex: 0,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        // Tabbing backwards leaves the field without mutating the value
        expect(actions.handleSelect).not.toHaveBeenCalled();
        expect(actions.closeList).toHaveBeenCalled();
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('handles Backspace in multiple mode with activeValue', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C' },
            ],
            activeValue: 1,
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Backspace' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.handleMultiItemClear).toHaveBeenCalledWith(1);
        expect(writes.activeValue).toEqual([0]);
    });

    it('handles Backspace in multiple mode when activeValue is 0', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            activeValue: 0,
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

        expect(actions.handleMultiItemClear).toHaveBeenCalledWith(0);
        expect(writes.activeValue).toBeUndefined();
    });

    it('handles ArrowLeft in multiple mode when activeValue is defined and not 0', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C' },
            ],
            activeValue: 2,
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        expect(writes.activeValue).toEqual([1]);
    });

    it('handles ArrowRight in multiple mode at last position', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            activeValue: 1, // last item
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

        expect(writes.activeValue).toEqual([undefined]);
    });

    it('handles ArrowRight in multiple mode to increment activeValue', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C' },
            ],
            activeValue: 0,
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

        expect(writes.activeValue).toEqual([1]);
    });

    it('handles ArrowUp when list is closed', () => {
        const { state, writes, actions } = createMock({ listOpen: false });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(writes.listOpen).toEqual([true]);
        expect(writes.activeValue).toEqual([undefined]);
    });

    it('handles Tab key when list is not open', () => {
        const { state, actions } = createMock({ listOpen: false, focused: true });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));

        expect(actions.closeList).not.toHaveBeenCalled();
        expect(actions.handleSelect).not.toHaveBeenCalled();
    });

    it('handles Backspace without multiple mode', () => {
        const { state, actions } = createMock({
            multiple: false,
            value: { value: 'a', label: 'A' },
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

        expect(actions.handleMultiItemClear).not.toHaveBeenCalled();
    });

    it('handles Backspace in multiple mode with filterText', () => {
        const { state, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            filterText: 'test',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

        expect(actions.handleMultiItemClear).not.toHaveBeenCalled();
    });

    it('handles Backspace in multiple mode when value length exceeds activeValue', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C' },
                { value: 'd', label: 'D' },
            ],
            activeValue: 2,
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

        expect(actions.handleMultiItemClear).toHaveBeenCalledWith(2);
        expect(writes.activeValue).toEqual([1]);
    });

    it('handles ArrowLeft when value is not array', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: { value: 'a', label: 'A' }, // Not an array
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        expect(writes.activeValue).toBeUndefined();
    });

    it('handles ArrowLeft when activeValue is 0', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            activeValue: 0,
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        expect(writes.activeValue).toBeUndefined();
    });

    it('handles ArrowLeft decrementing when conditions met', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C' },
            ],
            activeValue: 1, // Middle item, not 0
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        // value.length (3) > activeValue (1) && activeValue !== 0
        expect(writes.activeValue).toEqual([0]);
    });

    // 9th-audit fix: a cursor left stale by a mouse removal's reindexing
    // (index >= value.length) must never reach handleMultiItemClear — that
    // fired onclear(undefined) and, at length 1, cleared the remaining
    // untargeted tag. The press resets the cursor instead.
    it('resets a stale cursor on Backspace instead of removing out of range', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [{ value: 'a', label: 'A' }],
            activeValue: 1, // stale: >= value.length
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

        expect(actions.handleMultiItemClear).not.toHaveBeenCalled();
        expect(writes.activeValue).toEqual([undefined]);
    });

    it('re-enters from the last tag when a stale cursor presses ArrowLeft', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            activeValue: 2, // stale: == value.length
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        // A stale cursor re-enters like an unset one: from the last tag
        expect(writes.activeValue).toEqual([1]);
    });

    it('handles ArrowRight when activeValue exceeds bounds', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [{ value: 'a', label: 'A' }],
            activeValue: 5, // Way beyond bounds
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

        // Neither condition matches
        expect(writes.activeValue).toBeUndefined();
    });

    it('handles Backspace in multiple mode with undefined activeValue', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            activeValue: undefined, // Explicitly undefined
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

        expect(actions.handleMultiItemClear).toHaveBeenCalledWith(1);
        expect(writes.activeValue).toBeUndefined();
    });

    it('handles ArrowLeft with filterText present', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            activeValue: 1,
            filterText: 'test', // Has filterText
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        expect(writes.activeValue).toBeUndefined();
    });

    it('handles ArrowRight with filterText present', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            activeValue: 0,
            filterText: 'test', // Has filterText
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

        expect(writes.activeValue).toBeUndefined();
    });

    it('handles Home key to move hover to first selectable item', () => {
        const { state, writes, actions } = createMock({
            listOpen: true,
            filteredItems: [
                { value: 'header', label: 'Header', selectable: false },
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            hoverItemIndex: 2,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Home' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(writes.hoverItemIndex).toEqual([1]);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('handles End key to move hover to last selectable item', () => {
        const { state, writes, actions } = createMock({
            listOpen: true,
            filteredItems: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C', selectable: false },
            ],
            hoverItemIndex: 0,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'End' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(writes.hoverItemIndex).toEqual([1]);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ignores Home and End when the list is closed', () => {
        const { state, writes, actions } = createMock({ listOpen: false });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Home' }));
        handleKeyDown(new KeyboardEvent('keydown', { key: 'End' }));

        expect(writes.hoverItemIndex).toBeUndefined();
    });

    it('ignores Home and End while filter text is entered so the caret can move', () => {
        const { state, writes, actions } = createMock({ listOpen: true, filterText: 'ab' });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Home' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(writes.hoverItemIndex).toBeUndefined();
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    describe('type-ahead (searchable={false})', () => {
        const fruits = [
            { value: 'apple', label: 'Apple' },
            { value: 'banana', label: 'Banana' },
            { value: 'blueberry', label: 'Blueberry' },
            { value: 'cherry', label: 'Cherry' },
        ] as SelectItem[];

        function keyEvent(key: string, timeStamp: number, init: KeyboardEventInit = {}) {
            const event = new KeyboardEvent('keydown', { key, ...init });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
            Object.defineProperty(event, 'timeStamp', { value: timeStamp });
            return event;
        }

        it('moves hover to the next option starting with the typed character and claims the event', () => {
            const { state, writes, actions } = createMock({
                searchable: false,
                listOpen: true,
                filteredItems: fruits,
                hoverItemIndex: 0,
            });
            const { handleKeyDown } = useKeyboardNavigation(state, actions);

            const event = keyEvent('b', 1000);
            handleKeyDown(event);

            expect(writes.hoverItemIndex).toEqual([1]);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        it('opens the list when it is closed', () => {
            const { state, writes, actions } = createMock({
                searchable: false,
                listOpen: false,
                filteredItems: fruits,
                hoverItemIndex: 1,
            });
            const { handleKeyDown } = useKeyboardNavigation(state, actions);

            handleKeyDown(keyEvent('c', 1000));

            expect(writes.listOpen).toEqual([true]);
            expect(writes.hoverItemIndex).toEqual([3]);
        });

        it('refines the match as characters accumulate within the pause window', () => {
            const { state, writes, actions } = createMock({
                searchable: false,
                listOpen: true,
                filteredItems: fruits,
                hoverItemIndex: 0,
            });
            const { handleKeyDown } = useKeyboardNavigation(state, actions);

            handleKeyDown(keyEvent('b', 1000)); // Banana
            handleKeyDown(keyEvent('l', 1100)); // "bl" -> Blueberry

            expect(writes.hoverItemIndex).toEqual([1, 2]);
        });

        it('cycles through options with the same initial on a repeated character', () => {
            const { state, writes, actions } = createMock({
                searchable: false,
                listOpen: true,
                filteredItems: fruits,
                hoverItemIndex: 1,
            });
            const { handleKeyDown } = useKeyboardNavigation(state, actions);

            handleKeyDown(keyEvent('b', 1000)); // from Banana -> Blueberry
            handleKeyDown(keyEvent('b', 1100)); // wraps back to Banana

            expect(writes.hoverItemIndex).toEqual([2, 1]);
        });

        it('starts a fresh query after the pause window', () => {
            const { state, writes, actions } = createMock({
                searchable: false,
                listOpen: true,
                filteredItems: fruits,
                hoverItemIndex: 0,
            });
            const { handleKeyDown } = useKeyboardNavigation(state, actions);

            handleKeyDown(keyEvent('b', 1000)); // Banana
            handleKeyDown(keyEvent('c', 2500)); // stale "b" dropped -> Cherry, not "bc"

            expect(writes.hoverItemIndex).toEqual([1, 3]);
        });

        it('skips non-selectable options', () => {
            const { state, writes, actions } = createMock({
                searchable: false,
                listOpen: true,
                filteredItems: [
                    { value: 'apple', label: 'Apple' },
                    { value: 'banana', label: 'Banana', selectable: false },
                    { value: 'blueberry', label: 'Blueberry' },
                ] as SelectItem[],
                hoverItemIndex: 0,
            });
            const { handleKeyDown } = useKeyboardNavigation(state, actions);

            handleKeyDown(keyEvent('b', 1000));

            expect(writes.hoverItemIndex).toEqual([2]);
        });

        it('does nothing when the select is searchable', () => {
            const { state, writes, actions } = createMock({ searchable: true, listOpen: true });
            const { handleKeyDown } = useKeyboardNavigation(state, actions);

            const event = keyEvent('b', 1000);
            handleKeyDown(event);

            expect(writes.hoverItemIndex).toBeUndefined();
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('ignores modifier chords so shortcuts keep working', () => {
            const { state, writes, actions } = createMock({
                searchable: false,
                listOpen: true,
                filteredItems: fruits,
            });
            const { handleKeyDown } = useKeyboardNavigation(state, actions);

            const event = keyEvent('b', 1000, { ctrlKey: true });
            handleKeyDown(event);

            expect(writes.hoverItemIndex).toBeUndefined();
            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });
});
