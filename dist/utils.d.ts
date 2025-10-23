import type { SelectItem } from './types';
export declare function getItemProperty<T>(item: T, key: keyof T | string): T[keyof T] | undefined;
export declare function areItemsEqual(a: any, b: any, itemId: string): boolean;
export declare function isCancelled(res: any): res is {
    cancelled: boolean;
};
export declare function isStringArray(arr: any[]): arr is string[];
export declare function isItemSelectableCheck(item: SelectItem | undefined): boolean;
export declare function hasValueChanged(newValue: any, oldValue: any): boolean;
export declare function createGroupHeaderItem(groupValue: string, item: SelectItem, labelKey?: string): SelectItem;
