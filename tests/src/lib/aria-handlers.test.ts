import { describe, it, expect, vi } from 'vitest';
import { useAriaHandlers } from '$lib/aria-handlers.svelte';
import type { SelectItem } from '$lib/types';

describe('useAriaHandlers', () => {
    describe('handleAriaSelection', () => {
        it('returns empty string when value is null', () => {
            const config = {
                ariaValues: vi.fn((v) => `Selected: ${v}`),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(),
            };

            const { handleAriaSelection } = useAriaHandlers(config);

            const context = {
                value: null,
                filteredItems: [],
                hoverItemIndex: 0,
                listOpen: false,
                multiple: false,
                label: 'label',
            };

            const result = handleAriaSelection(context);

            expect(result).toBe('');
            expect(config.ariaValues).not.toHaveBeenCalled();
        });

        it('returns empty string when value is undefined', () => {
            const config = {
                ariaValues: vi.fn((v) => `Selected: ${v}`),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(),
            };

            const { handleAriaSelection } = useAriaHandlers(config);

            const context = {
                value: undefined,
                filteredItems: [],
                hoverItemIndex: 0,
                listOpen: false,
                multiple: false,
                label: 'label',
            };

            const result = handleAriaSelection(context);

            expect(result).toBe('');
            expect(config.ariaValues).not.toHaveBeenCalled();
        });

        it('handles string value', () => {
            const config = {
                ariaValues: vi.fn((v) => `Selected: ${v}`),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(),
            };

            const { handleAriaSelection } = useAriaHandlers(config);

            const context = {
                value: 'test',
                filteredItems: [],
                hoverItemIndex: 0,
                listOpen: false,
                multiple: false,
                label: 'label',
            };

            const result = handleAriaSelection(context);

            expect(config.ariaValues).toHaveBeenCalledWith('test');
            expect(result).toBe('Selected: test');
        });

        it('handles multiple SelectItem array', () => {
            const config = {
                ariaValues: vi.fn((v) => `Selected: ${v}`),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(),
            };

            const { handleAriaSelection } = useAriaHandlers(config);

            const items: SelectItem[] = [
                { value: 'a', label: 'Item A' },
                { value: 'b', label: 'Item B' },
            ];

            const context = {
                value: items,
                filteredItems: [],
                hoverItemIndex: 0,
                listOpen: false,
                multiple: true,
                label: 'label',
            };

            const result = handleAriaSelection(context);

            expect(config.ariaValues).toHaveBeenCalledWith('Item A, Item B');
            expect(result).toBe('Selected: Item A, Item B');
        });

        it('handles single SelectItem', () => {
            const config = {
                ariaValues: vi.fn((v) => `Selected: ${v}`),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(),
            };

            const { handleAriaSelection } = useAriaHandlers(config);

            const item: SelectItem = { value: 'a', label: 'Item A' };

            const context = {
                value: item,
                filteredItems: [],
                hoverItemIndex: 0,
                listOpen: false,
                multiple: false,
                label: 'label',
            };

            const result = handleAriaSelection(context);

            expect(config.ariaValues).toHaveBeenCalledWith('Item A');
            expect(result).toBe('Selected: Item A');
        });

        it('handles empty array in multiple mode', () => {
            const config = {
                ariaValues: vi.fn((v) => `Selected: ${v}`),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(),
            };

            const { handleAriaSelection } = useAriaHandlers(config);

            const context = {
                value: [],
                filteredItems: [],
                hoverItemIndex: 0,
                listOpen: false,
                multiple: true,
                label: 'label',
            };

            const result = handleAriaSelection(context);

            expect(config.ariaValues).toHaveBeenCalledWith('');
            expect(result).toBe('Selected: ');
        });
    });

    describe('handleAriaContent', () => {
        it('returns empty string when filteredItems is empty', () => {
            const config = {
                ariaValues: vi.fn(),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(),
            };

            const { handleAriaContent } = useAriaHandlers(config);

            const context = {
                value: null,
                filteredItems: [],
                hoverItemIndex: 0,
                listOpen: false,
                multiple: false,
                label: 'label',
            };

            const result = handleAriaContent(context);

            expect(result).toBe('');
            expect(config.ariaListOpen).not.toHaveBeenCalled();
            expect(config.ariaFocused).not.toHaveBeenCalled();
        });

        it('calls ariaListOpen when list is open with items', () => {
            const config = {
                ariaValues: vi.fn(),
                ariaListOpen: vi.fn((label, count) => `${label} - ${count} items`),
                ariaFocused: vi.fn(),
            };

            const { handleAriaContent } = useAriaHandlers(config);

            const items: SelectItem[] = [
                { value: 'a', label: 'Item A' },
                { value: 'b', label: 'Item B' },
            ];

            const context = {
                value: null,
                filteredItems: items,
                hoverItemIndex: 0,
                listOpen: true,
                multiple: false,
                label: 'label',
            };

            const result = handleAriaContent(context);

            expect(config.ariaListOpen).toHaveBeenCalledWith('Item A', 2);
            expect(result).toBe('Item A - 2 items');
        });

        it('calls ariaFocused when list is closed', () => {
            const config = {
                ariaValues: vi.fn(),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(() => 'Focused on select'),
            };

            const { handleAriaContent } = useAriaHandlers(config);

            const items: SelectItem[] = [
                { value: 'a', label: 'Item A' },
            ];

            const context = {
                value: null,
                filteredItems: items,
                hoverItemIndex: 0,
                listOpen: false,
                multiple: false,
                label: 'label',
            };

            const result = handleAriaContent(context);

            expect(config.ariaFocused).toHaveBeenCalled();
            expect(result).toBe('Focused on select');
        });

        it('calls ariaFocused when item is not found', () => {
            const config = {
                ariaValues: vi.fn(),
                ariaListOpen: vi.fn(),
                ariaFocused: vi.fn(() => 'Focused on select'),
            };

            const { handleAriaContent } = useAriaHandlers(config);

            const items: SelectItem[] = [
                { value: 'a', label: 'Item A' },
            ];

            const context = {
                value: null,
                filteredItems: items,
                hoverItemIndex: 5, // Out of bounds
                listOpen: true,
                multiple: false,
                label: 'label',
            };

            const result = handleAriaContent(context);

            expect(config.ariaFocused).toHaveBeenCalled();
            expect(result).toBe('Focused on select');
        });
    });
});