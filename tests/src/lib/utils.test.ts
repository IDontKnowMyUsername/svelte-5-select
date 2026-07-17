// tests/src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import {
    areItemsEqual,
    convertStringItemsToObjects,
    createGroupHeaderItem,
    hasValueChanged,
    isGroupHeader,
    normalizeItem,
} from '$lib/utils';

describe('areItemsEqual', () => {
    it('returns true for matching items', () => {
        const a = { value: 'chocolate', label: 'Chocolate' };
        const b = { value: 'chocolate', label: 'Different Label' };

        expect(areItemsEqual(a, b, 'value')).toBe(true);
    });

    it('returns false for different items', () => {
        const a = { value: 'chocolate', label: 'Chocolate' };
        const b = { value: 'pizza', label: 'Pizza' };

        expect(areItemsEqual(a, b, 'value')).toBe(false);
    });

    it('handles null values safely', () => {
        expect(areItemsEqual(null, { value: 'a' }, 'value')).toBe(false);
        expect(areItemsEqual({ value: 'a' }, null, 'value')).toBe(false);
        expect(areItemsEqual(null, null, 'value')).toBe(false);
    });

    it('handles undefined values safely', () => {
        expect(areItemsEqual(undefined, { value: 'a' }, 'value')).toBe(false);
        expect(areItemsEqual({ value: 'a' }, undefined, 'value')).toBe(false);
    });

    it('handles non-object values', () => {
        expect(areItemsEqual('string' as any, { value: 'a' }, 'value')).toBe(false);
        expect(areItemsEqual(123 as any, { value: 'a' }, 'value')).toBe(false);
    });
});

describe('normalizeItem', () => {
    it('converts a string into a value/label item', () => {
        expect(normalizeItem('cake')).toEqual({ value: 'cake', label: 'cake' });
    });

    it('passes items and arrays through unchanged', () => {
        const item = { value: 'a', label: 'A' };
        const arr = [item];

        expect(normalizeItem(item)).toBe(item);
        expect(normalizeItem(arr)).toBe(arr);
    });

    it('normalizes empty values to null', () => {
        expect(normalizeItem(null)).toBeNull();
        expect(normalizeItem(undefined)).toBeNull();
        expect(normalizeItem('')).toBeNull();
    });
});

describe('hasValueChanged', () => {
    it('compares single items by itemId', () => {
        expect(hasValueChanged({ value: 'a', label: 'A' }, { value: 'a', label: 'Other' }, 'value')).toBe(false);
        expect(hasValueChanged({ value: 'a' }, { value: 'b' }, 'value')).toBe(true);
    });

    it('compares strings by identity', () => {
        expect(hasValueChanged('cake', 'cake', 'value')).toBe(false);
        expect(hasValueChanged('cake', 'pizza', 'value')).toBe(true);
    });

    it('treats a string and the item it resolves to (same id) as unchanged', () => {
        // Mount-time normalization turns a raw string value into its item; the
        // selection did not change, so this must not count as a change.
        expect(hasValueChanged({ value: 'cake', label: 'cake' }, 'cake', 'value')).toBe(false);
        // A string and an item with a different id are still a change
        expect(hasValueChanged({ value: 'cake', label: 'cake' }, 'pizza', 'value')).toBe(true);
    });

    it('compares arrays pairwise by itemId', () => {
        const a = [{ value: 'a' }, { value: 'b' }];

        expect(hasValueChanged(a, [{ value: 'a' }, { value: 'b' }], 'value')).toBe(false);
        expect(hasValueChanged(a, [{ value: 'a' }, { value: 'c' }], 'value')).toBe(true);
        expect(hasValueChanged(a, [{ value: 'b' }, { value: 'a' }], 'value')).toBe(true);
        expect(hasValueChanged(a, [{ value: 'a' }], 'value')).toBe(true);
    });

    it('detects array/non-array transitions', () => {
        expect(hasValueChanged([{ value: 'a' }], { value: 'a' }, 'value')).toBe(true);
        expect(hasValueChanged({ value: 'a' }, [{ value: 'a' }], 'value')).toBe(true);
    });

    it('handles null and undefined', () => {
        expect(hasValueChanged(null, null, 'value')).toBe(false);
        expect(hasValueChanged(undefined, null, 'value')).toBe(true);
        expect(hasValueChanged({ value: 'a' }, null, 'value')).toBe(true);
    });
});

describe('convertStringItemsToObjects', () => {
    it('converts strings into indexed items', () => {
        expect(convertStringItemsToObjects(['one', 'two'])).toEqual([
            { index: 0, value: 'one', label: 'one' },
            { index: 1, value: 'two', label: 'two' },
        ]);
    });
});

describe('createGroupHeaderItem', () => {
    it('uses the group value for value and label', () => {
        expect(createGroupHeaderItem('Sweet')).toEqual({ value: 'Sweet', label: 'Sweet' });
    });

    it('honors a custom label key', () => {
        expect(createGroupHeaderItem('Sweet', 'name')).toEqual({ value: 'Sweet', name: 'Sweet' });
    });
});

describe('isGroupHeader', () => {
    it('narrows a synthesized header row', () => {
        expect(isGroupHeader({ value: 'Sweet', label: 'Sweet', groupHeader: true, selectable: false })).toBe(true);
        expect(isGroupHeader({ value: 'Sweet', label: 'Sweet', groupHeader: true, selectable: true })).toBe(true);
    });

    it('rejects plain items, truthy non-boolean markers, and empties', () => {
        expect(isGroupHeader({ value: 'pizza', label: 'Pizza' })).toBe(false);
        // The guard demands the literal `true`, not any truthy marker
        expect(isGroupHeader({ groupHeader: 'yes' as unknown as boolean })).toBe(false);
        expect(isGroupHeader(null)).toBe(false);
        expect(isGroupHeader(undefined)).toBe(false);
    });
});
