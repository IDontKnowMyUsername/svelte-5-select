import type { FilterConfig, SelectItem } from './types';
export default function filter({ loadOptions, filterText, items, multiple, value, itemId, groupBy, filterSelectedItems, itemFilter, convertStringItemsToObjects, filterGroupedItems, label, }: FilterConfig): SelectItem[];
