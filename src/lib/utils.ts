import type { SelectItem } from '$lib/types';

export function getItemProperty<T>(item: T, key: keyof T | string): T[keyof T] | undefined {
    return item && typeof item === 'object' ? (item as any)[key] : undefined;
}

export function areItemsEqual(a: any, b: any, itemId: string): boolean {
    if (!a || !b) return false;
    return getItemProperty(a, itemId) === getItemProperty(b, itemId);
}

export function isCancelled(res: any): res is { cancelled: boolean } {
    return res && typeof res === 'object' && 'cancelled' in res && res.cancelled === true;
}

export function isStringArray(arr: any[]): arr is string[] {
    return arr.length > 0 && arr.every(item => typeof item === 'string');
}

export function isItemSelectableCheck(item: SelectItem | undefined): boolean {
    if (!item) return false;
    return !item.hasOwnProperty('selectable') || item.selectable !== false;
}

export function hasValueChanged(newValue: any, oldValue: any): boolean {
    return JSON.stringify(newValue) !== JSON.stringify(oldValue);
}

export function createGroupHeaderItem(groupValue: string, item: SelectItem, labelKey: string = 'label'): SelectItem {
    return {
        value: groupValue,
        [labelKey]: groupValue,
    };
}
