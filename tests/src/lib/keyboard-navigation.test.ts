import { describe, it, expect, vi } from 'vitest';
import { useKeyboardNavigation } from '$lib/keyboard-navigation.svelte';
import type { SelectItem } from '$lib/types';

describe('useKeyboardNavigation', () => {
    function createMockContext() {
        const state = {
            listOpen: false,
            filteredItems: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
            ] as SelectItem[],
            hoverItemIndex: 0,
            multiple: false,
            value: null as SelectItem | SelectItem[] | null,
            filterText: '',
            activeValue: undefined as number | undefined,
            itemId: 'value',
            focused: true,
        };

        return {
            getState: () => state,
            setListOpen: vi.fn((v) => state.listOpen = v),
            setHoverItemIndex: vi.fn((v) => state.hoverItemIndex = v),
            setActiveValue: vi.fn((v) => state.activeValue = v),
            closeList: vi.fn(),
            setHoverIndex: vi.fn(),
            handleSelect: vi.fn(),
            handleMultiItemClear: vi.fn(),
        };
    }

    it('handles Escape key', () => {
        const context = createMockContext();
        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(context.closeList).toHaveBeenCalled();
    });

    it('handles ArrowDown when list is closed', () => {
        const context = createMockContext();
        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(context.setListOpen).toHaveBeenCalledWith(true);
        expect(context.setActiveValue).toHaveBeenCalledWith(undefined);
    });

    it('handles Enter key to select item', () => {
        const context = createMockContext();
        context.getState().listOpen = true;

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(context.handleSelect).toHaveBeenCalledWith(
            context.getState().filteredItems[0]
        );
    });

    it('does nothing when not focused', () => {
        const context = createMockContext();
        context.getState().focused = false;

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

        handleKeyDown(event);

        expect(context.handleSelect).not.toHaveBeenCalled();
        expect(context.closeList).not.toHaveBeenCalled();
    });

    it('handles Tab key when value equals hover item', () => {
        const context = createMockContext();
        context.getState().listOpen = true;
        context.getState().focused = true;
        context.getState().value = { value: 'a', label: 'A' };
        context.getState().hoverItemIndex = 0;

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(context.closeList).toHaveBeenCalled();
        expect(context.handleSelect).not.toHaveBeenCalled();
    });

    it('handles Tab key to select item when different from hover', () => {
        const context = createMockContext();
        context.getState().listOpen = true;
        context.getState().focused = true;
        context.getState().value = { value: 'b', label: 'B' };
        context.getState().hoverItemIndex = 0;

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(context.handleSelect).toHaveBeenCalledWith(
            context.getState().filteredItems[0]
        );
        expect(context.closeList).toHaveBeenCalled();
    });

    it('handles Backspace in multiple mode with activeValue', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
        ];
        context.getState().activeValue = 1;
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Backspace' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(context.handleMultiItemClear).toHaveBeenCalledWith(1);
        expect(context.setActiveValue).toHaveBeenCalledWith(0);
    });

    it('handles Backspace in multiple mode when activeValue is 0', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        context.getState().activeValue = 0;
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Backspace' });

        handleKeyDown(event);

        expect(context.handleMultiItemClear).toHaveBeenCalledWith(0);
        expect(context.setActiveValue).not.toHaveBeenCalled();
    });

    it('handles ArrowLeft in multiple mode when activeValue is defined and not 0', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
        ];
        context.getState().activeValue = 2;
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

        handleKeyDown(event);

        expect(context.setActiveValue).toHaveBeenCalledWith(1);
    });

    it('handles ArrowRight in multiple mode at last position', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        context.getState().activeValue = 1; // last item
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });

        handleKeyDown(event);

        expect(context.setActiveValue).toHaveBeenCalledWith(undefined);
    });

    it('handles ArrowRight in multiple mode to increment activeValue', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
        ];
        context.getState().activeValue = 0;
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });

        handleKeyDown(event);

        expect(context.setActiveValue).toHaveBeenCalledWith(1);
    });

    it('handles ArrowUp when list is closed', () => {
        const context = createMockContext();
        context.getState().listOpen = false;

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

        handleKeyDown(event);

        expect(context.setListOpen).toHaveBeenCalledWith(true);
        expect(context.setActiveValue).toHaveBeenCalledWith(undefined);
    });

    it('handles Tab key when list is not open', () => {
        const context = createMockContext();
        context.getState().listOpen = false;
        context.getState().focused = true;

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Tab' });

        handleKeyDown(event);

        expect(context.closeList).not.toHaveBeenCalled();
        expect(context.handleSelect).not.toHaveBeenCalled();
    });

    it('handles Backspace without multiple mode', () => {
        const context = createMockContext();
        context.getState().multiple = false;
        context.getState().value = { value: 'a', label: 'A' };
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Backspace' });

        handleKeyDown(event);

        expect(context.handleMultiItemClear).not.toHaveBeenCalled();
    });

    it('handles Backspace in multiple mode with filterText', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        context.getState().filterText = 'test';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Backspace' });

        handleKeyDown(event);

        expect(context.handleMultiItemClear).not.toHaveBeenCalled();
    });

    it('handles Backspace in multiple mode when value length exceeds activeValue', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
            { value: 'd', label: 'D' },
        ];
        context.getState().activeValue = 2;
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Backspace' });

        handleKeyDown(event);

        expect(context.handleMultiItemClear).toHaveBeenCalledWith(2);
        expect(context.setActiveValue).toHaveBeenCalledWith(1);
    });

    it('handles ArrowLeft when value is not array', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = { value: 'a', label: 'A' }; // Not an array
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

        handleKeyDown(event);

        expect(context.setActiveValue).not.toHaveBeenCalled();
    });

    it('handles ArrowLeft when activeValue is 0', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        context.getState().activeValue = 0;
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

        handleKeyDown(event);

        expect(context.setActiveValue).not.toHaveBeenCalled();
    });

    it('handles ArrowLeft decrementing when conditions met', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
        ];
        context.getState().activeValue = 1;  // Middle item, not 0
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

        handleKeyDown(event);

        // value.length (3) > activeValue (1) && activeValue !== 0
        expect(context.setActiveValue).toHaveBeenCalledWith(0);
    });

    it('handles Backspace when value.length equals activeValue', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
        ];
        context.getState().activeValue = 1;  // After removal, value.length will be 1
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Backspace' });

        handleKeyDown(event);

        expect(context.handleMultiItemClear).toHaveBeenCalledWith(1);
        // After removal, value.length is 1, activeValue is 1
        // Since 1 is NOT > 1, newActiveValue = undefined
        expect(context.setActiveValue).toHaveBeenCalledWith(undefined);
    });

    it('handles ArrowLeft when activeValue equals value.length', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        context.getState().activeValue = 2;  // Equal to value.length
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

        handleKeyDown(event);

        // value.length (2) is NOT > activeValue (2), so condition is false
        expect(context.setActiveValue).not.toHaveBeenCalled();
    });

    it('handles ArrowRight when activeValue exceeds bounds', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
        ];
        context.getState().activeValue = 5;  // Way beyond bounds
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });

        handleKeyDown(event);

        // Neither condition matches
        expect(context.setActiveValue).not.toHaveBeenCalled();
    });

    it('handles Backspace in multiple mode with undefined activeValue', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        context.getState().activeValue = undefined;  // Explicitly undefined
        context.getState().filterText = '';

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'Backspace' });

        handleKeyDown(event);

        expect(context.handleMultiItemClear).toHaveBeenCalledWith(1);
        expect(context.setActiveValue).not.toHaveBeenCalled();
    });

    it('handles ArrowLeft with filterText present', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        context.getState().activeValue = 1;
        context.getState().filterText = 'test';  // Has filterText

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

        handleKeyDown(event);

        expect(context.setActiveValue).not.toHaveBeenCalled();
    });

    it('handles ArrowRight with filterText present', () => {
        const context = createMockContext();
        context.getState().multiple = true;
        context.getState().value = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        context.getState().activeValue = 0;
        context.getState().filterText = 'test';  // Has filterText

        const { handleKeyDown } = useKeyboardNavigation(context);

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });

        handleKeyDown(event);

        expect(context.setActiveValue).not.toHaveBeenCalled();
    });
});