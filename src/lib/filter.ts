import type { FilterConfig, ItemLike, SelectItem } from './types';
import { areItemsEqual, isStringArray } from '$lib/utils';

export default function filter<Item extends ItemLike = SelectItem>({
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
}: FilterConfig<Item>): SelectItem[] {
    // If no items, return empty array
    if (!items) {
        return [];
    }

    let typedItems: SelectItem[] = items as SelectItem[];

    const aStringArray = isStringArray(typedItems);
    if (aStringArray) {
        typedItems = convertStringItemsToObjects(typedItems as unknown as string[]);
    }

    // Filter items based on filter text and selection.
    // With loadOptions the results are already filtered remotely, so skip itemFilter.
    // String items were converted to plain SelectItems above, hence the Item cast.
    let filterResults: SelectItem[] = typedItems.filter((item: SelectItem): boolean => {
        let matchesFilter: boolean = loadOptions ? true : itemFilter(item[label] as string, filterText, item as Item);

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
