// tests/src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { areItemsEqual } from '$lib/utils';

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