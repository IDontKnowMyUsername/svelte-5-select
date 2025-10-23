import { areItemsEqual, isStringArray } from './utils';
export default function filter({ loadOptions, filterText = '', items, multiple, value, itemId, groupBy, filterSelectedItems, itemFilter, convertStringItemsToObjects, filterGroupedItems, label, }) {
    if (items && loadOptions) {
        return items;
    }
    // If no items, return empty array
    if (!items) {
        return [];
    }
    let typedItems = items;
    const aStringArray = isStringArray(typedItems);
    if (aStringArray) {
        typedItems = convertStringItemsToObjects(typedItems);
    }
    // Filter items based on filter text and selection
    let filterResults = typedItems.filter((item) => {
        let matchesFilter = itemFilter(item[label], filterText, item);
        if (matchesFilter && multiple && Array.isArray(value) && value.length > 0) {
            matchesFilter = !value.some((x) => {
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
