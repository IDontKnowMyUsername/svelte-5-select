import type { ItemLike, SelectGroupHeader, SelectItem } from '$lib/types';

/**
 * Narrows a rendered list row to a synthesized group header (see the `groupBy` prop).
 * Rows that fail this guard are your own item type.
 */
export function isGroupHeader(row: ItemLike | null | undefined): row is SelectGroupHeader {
    return !!row && (row as SelectGroupHeader).groupHeader === true;
}

export function getItemProperty<T>(item: T, key: keyof T | string): T[keyof T] | undefined {
    return item && typeof item === 'object' ? (item as any)[key] : undefined;
}

/** Compares two value entries by their `itemId` field, never by reference. Accepts any {@link ItemLike} item type. */
export function areItemsEqual(a: ItemLike | null | undefined, b: ItemLike | null | undefined, itemId: string): boolean {
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

/**
 * Normalizes a raw string value into a synthesized `{ value, label }` item; items
 * (and arrays of them) pass through unchanged. Accepts any {@link ItemLike} item
 * type — a synthesized entry is a `SelectItem`, not your item type.
 */
export function normalizeItem<Item extends ItemLike = SelectItem>(
    value: string | Item | null | undefined,
): Item | SelectItem | null;
export function normalizeItem<Item extends ItemLike = SelectItem>(
    value: string | Item | (Item | string)[] | null | undefined,
): Item | SelectItem | (Item | SelectItem)[] | null;
export function normalizeItem(
    value: string | ItemLike | (ItemLike | string)[] | null | undefined,
): ItemLike | ItemLike[] | null {
    if (!value) return null;
    // Entries of an array value may still be raw strings; callers normalize per entry
    return typeof value === 'string' ? { value, label: value } : (value as ItemLike | ItemLike[]);
}

// The comparable id of a value entry: a raw string is its own id, an item uses
// its itemId field.
function entryId(v: SelectItem | string | null | undefined, itemId: string): unknown {
    return typeof v === 'string' ? v : getItemProperty(v, itemId);
}

// Compare by id, not by reference type: a raw string and the item it resolves to
// share an id, so mount-time string-to-item normalization is the same selection —
// not a change — and must not dispatch onValueChange. Two items compare by itemId.
function haveEntriesChanged(
    a: SelectItem | string | null | undefined,
    b: SelectItem | string | null | undefined,
    itemId: string,
): boolean {
    if (typeof a === 'string' || typeof b === 'string') {
        return entryId(a, itemId) !== entryId(b, itemId);
    }
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
