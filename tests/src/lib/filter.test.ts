import { describe, it, expect, vi } from 'vitest';
import filter from '$lib/filter';
import type { SelectItem } from '$lib/types';

describe('filter', () => {
    const mockItemFilter = vi.fn((label: string, filterText: string) =>
        label.toLowerCase().includes(filterText.toLowerCase())
    );

    const mockConvertStringItemsToObjects = (items: string[]): SelectItem[] =>
        items.map((item, index) => ({ value: item, label: item, index }));

    const mockFilterGroupedItems = (items: SelectItem[]): SelectItem[] => items;

    it('returns items when both items and loadOptions are provided', () => {
        const items: SelectItem[] = [
            { value: 'a', label: 'Item A' },
            { value: 'b', label: 'Item B' },
        ];

        const result = filter({
            loadOptions: vi.fn(),
            filterText: '',
            items,
            multiple: false,
            value: null,
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toEqual(items);
    });

    it('returns empty array when items is null', () => {
        const result = filter({
            loadOptions: undefined,
            filterText: '',
            items: null,
            multiple: false,
            value: null,
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toEqual([]);
    });

    it('converts string array to SelectItem objects', () => {
        const items = ['Apple', 'Banana', 'Cherry'];

        const result = filter({
            loadOptions: undefined,
            filterText: '',
            items,
            multiple: false,
            value: null,
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ value: 'Apple', label: 'Apple', index: 0 });
    });

    it('filters items by filterText', () => {
        const items: SelectItem[] = [
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
            { value: 'c', label: 'Cherry' },
        ];

        const result = filter({
            loadOptions: undefined,
            filterText: 'app',
            items,
            multiple: false,
            value: null,
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('Apple');
    });

    it('filters out selected items in multiple mode when filterSelectedItems is true', () => {
        const items: SelectItem[] = [
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
            { value: 'c', label: 'Cherry' },
        ];

        const selectedValue: SelectItem[] = [
            { value: 'a', label: 'Apple' },
        ];

        const result = filter({
            loadOptions: undefined,
            filterText: '',
            items,
            multiple: true,
            value: selectedValue,
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toHaveLength(2);
        expect(result.find(item => item.value === 'a')).toBeUndefined();
        expect(result.find(item => item.value === 'b')).toBeDefined();
        expect(result.find(item => item.value === 'c')).toBeDefined();
    });

    it('does not filter out selected items when filterSelectedItems is false', () => {
        const items: SelectItem[] = [
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
            { value: 'c', label: 'Cherry' },
        ];

        const selectedValue: SelectItem[] = [
            { value: 'a', label: 'Apple' },
        ];

        const result = filter({
            loadOptions: undefined,
            filterText: '',
            items,
            multiple: true,
            value: selectedValue,
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: false,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toHaveLength(3);
        expect(result.find(item => item.value === 'a')).toBeDefined();
    });

    it('applies grouping when groupBy is provided', () => {
        const items: SelectItem[] = [
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
        ];

        const mockFilterGroupedItemsWithGrouping = vi.fn((items: SelectItem[]) => {
            return [
                { value: 'group', label: 'Fruits', groupHeader: true },
                ...items,
            ];
        });

        const result = filter({
            loadOptions: undefined,
            filterText: '',
            items,
            multiple: false,
            value: null,
            itemId: 'value',
            groupBy: () => 'Fruits',
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItemsWithGrouping,
            label: 'label',
        });

        expect(mockFilterGroupedItemsWithGrouping).toHaveBeenCalled();
        expect(result).toHaveLength(3);
        expect(result[0].groupHeader).toBe(true);
    });

    it('handles single mode with no filtering', () => {
        const items: SelectItem[] = [
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
        ];

        const result = filter({
            loadOptions: undefined,
            filterText: '',
            items,
            multiple: false,
            value: { value: 'a', label: 'Apple' },
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toHaveLength(2);
    });

    it('handles empty value array in multiple mode', () => {
        const items: SelectItem[] = [
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
        ];

        const result = filter({
            loadOptions: undefined,
            filterText: '',
            items,
            multiple: true,
            value: [],
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toHaveLength(2);
    });

    it('handles multiple selected items filtering', () => {
        const items: SelectItem[] = [
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
            { value: 'c', label: 'Cherry' },
            { value: 'd', label: 'Date' },
        ];

        const selectedValue: SelectItem[] = [
            { value: 'a', label: 'Apple' },
            { value: 'c', label: 'Cherry' },
        ];

        const result = filter({
            loadOptions: undefined,
            filterText: '',
            items,
            multiple: true,
            value: selectedValue,
            itemId: 'value',
            groupBy: undefined,
            filterSelectedItems: true,
            itemFilter: mockItemFilter,
            convertStringItemsToObjects: mockConvertStringItemsToObjects,
            filterGroupedItems: mockFilterGroupedItems,
            label: 'label',
        });

        expect(result).toHaveLength(2);
        expect(result.find(item => item.value === 'b')).toBeDefined();
        expect(result.find(item => item.value === 'd')).toBeDefined();
    });
});