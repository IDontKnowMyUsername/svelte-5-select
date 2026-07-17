import type { FilterConfig, ItemLike, SelectItem } from './types';
import { areItemsEqual, isStringArray } from '$lib/utils';

/**
 * The built-in filtering pipeline: converts raw string items, applies
 * `itemFilter` against the filter text (skipped when `loadOptions` is set —
 * loader results are already filtered remotely), hides selected options in
 * multiple mode (`filterSelectedItems`), and applies grouping. Exported so a
 * custom `filter` prop can delegate to it before or after its own logic; see
 * {@link FilterConfig} for what each field carries.
 */
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
    applyGrouping,
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
            matchesFilter = !value.some((x): boolean => {
                return filterSelectedItems ? areItemsEqual(x, item, itemId) : false;
            });
        }

        return matchesFilter;
    });

    // Apply grouping if groupBy function is provided
    if (groupBy) {
        filterResults = applyGrouping(filterResults);
    }

    return filterResults;
}
