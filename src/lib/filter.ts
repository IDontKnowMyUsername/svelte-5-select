import type { FilterConfig, SelectItem } from './types';
import { areItemsEqual, isStringArray } from '$lib/utils';

export default function filter({
                                   loadOptions,
                                   filterText = '',
                                   items,
                                   multiple,
                                   value,
                                   itemId,
                                   groupBy,
                                   filterSelectedItems,
                                   itemFilter,
                                   convertStringItemsToObjects,
                                   filterGroupedItems,
                                   label,
                               }: FilterConfig): SelectItem[] {
    if (items && loadOptions) {
        return items as SelectItem[];
    }

    // If no items, return empty array
    if (!items) {
        return [];
    }

    let typedItems: SelectItem[] = items as SelectItem[];

    const aStringArray = isStringArray(typedItems);
    if (aStringArray) {
        typedItems = convertStringItemsToObjects(typedItems as unknown as string[]);
    }

    // Filter items based on filter text and selection
    let filterResults: SelectItem[] = typedItems.filter((item: SelectItem): boolean => {
        let matchesFilter: boolean = itemFilter(item[label], filterText, item);

        if (matchesFilter && multiple && Array.isArray(value) && value.length > 0) {
            matchesFilter = !value.some((x: SelectItem): boolean => {
                return filterSelectedItems ? areItemsEqual(x, item, itemId) : false;
            });
        }

        return matchesFilter;
    });

    // Apply grouping if groupBy function is provided
    if (groupBy) {
        filterResults = filterGroupedItems(filterResults);
    }

    return filterResults;
}