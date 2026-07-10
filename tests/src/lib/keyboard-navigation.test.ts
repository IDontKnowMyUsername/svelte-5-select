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
            focused: true,
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

    it('handles Escape key', () => {
        const { state, actions } = createMock();
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.closeList).toHaveBeenCalled();
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

    it('handles Tab key to select item when different from hover', () => {
        const { state, actions } = createMock({
            listOpen: true,
            focused: true,
            value: { value: 'b', label: 'B' },
            hoverItemIndex: 0,
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(actions.handleSelect).toHaveBeenCalledWith(state.filteredItems[0]);
        expect(actions.closeList).toHaveBeenCalled();
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

    it('handles Backspace when value.length equals activeValue', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [{ value: 'a', label: 'A' }],
            activeValue: 1, // After removal, value.length will be 1
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

        expect(actions.handleMultiItemClear).toHaveBeenCalledWith(1);
        // After removal, value.length is 1, activeValue is 1
        // Since 1 is NOT > 1, newActiveValue = undefined
        expect(writes.activeValue).toEqual([undefined]);
    });

    it('handles ArrowLeft when activeValue equals value.length', () => {
        const { state, writes, actions } = createMock({
            multiple: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ],
            activeValue: 2, // Equal to value.length
            filterText: '',
        });
        const { handleKeyDown } = useKeyboardNavigation(state, actions);

        handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

        // value.length (2) is NOT > activeValue (2), so condition is false
        expect(writes.activeValue).toBeUndefined();
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
});
