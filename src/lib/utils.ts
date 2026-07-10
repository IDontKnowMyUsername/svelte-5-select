import type { SelectItem } from '$lib/types';

export function getItemProperty<T>(item: T, key: keyof T | string): T[keyof T] | undefined {
    return item && typeof item === 'object' ? (item as any)[key] : undefined;
}

export function areItemsEqual(
    a: SelectItem | null | undefined,
    b: SelectItem | null | undefined,
    itemId: string,
): boolean {
    if (!a || !b) return false;
    return getItemProperty(a, itemId) === getItemProperty(b, itemId);
}

export function isStringArray(arr: unknown[]): arr is string[] {
    return arr.length > 0 && arr.every((item) => typeof item === 'string');
}

export function isItemSelectableCheck(item: SelectItem | undefined): boolean {
    if (!item) return false;
    return !Object.prototype.hasOwnProperty.call(item, 'selectable') || item.selectable !== false;
}

export function normalizeItem(value: string | SelectItem | null | undefined): SelectItem | null;
export function normalizeItem(
    value: string | SelectItem | (SelectItem | string)[] | null | undefined,
): SelectItem | SelectItem[] | null;
export function normalizeItem(
    value: string | SelectItem | (SelectItem | string)[] | null | undefined,
): SelectItem | SelectItem[] | null {
    if (!value) return null;
    // Entries of an array value may still be raw strings; callers normalize per entry
    return typeof value === 'string' ? { value, label: value } : (value as SelectItem | SelectItem[]);
}

// A string is only equal to itself; items compare by itemId. A string never
// equals an item, so mount-time string-to-item normalization counts as a change.
function haveEntriesChanged(
    a: SelectItem | string | null | undefined,
    b: SelectItem | string | null | undefined,
    itemId: string,
): boolean {
    if (typeof a === 'string' || typeof b === 'string') return a !== b;
    if (!a || !b) return a !== b;
    return !areItemsEqual(a, b, itemId);
}

export function hasValueChanged(
    newValue: SelectItem | string | (SelectItem | string)[] | null | undefined,
    oldValue: SelectItem | string | (SelectItem | string)[] | null | undefined,
    itemId: string,
): boolean {
    if (Array.isArray(newValue) !== Array.isArray(oldValue)) return true;
    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
        if (newValue.length !== oldValue.length) return true;
        return newValue.some((item, i) => haveEntriesChanged(item, oldValue[i], itemId));
    }
    // Neither side is an array here
    return haveEntriesChanged(
        newValue as SelectItem | string | null | undefined,
        oldValue as SelectItem | string | null | undefined,
        itemId,
    );
}

export function convertStringItemsToObjects(_items: string[]): SelectItem[] {
    return _items.map((item, index) => {
        return {
            index,
            value: item,
            label: `${item}`,
        };
    });
}

export function createGroupHeaderItem(groupValue: string, labelKey: string = 'label'): SelectItem {
    return {
        value: groupValue,
        [labelKey]: groupValue,
    };
}
