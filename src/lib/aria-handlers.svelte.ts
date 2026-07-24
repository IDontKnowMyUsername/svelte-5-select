import type { SelectItem } from './types.js';
import { isItemSelectableCheck } from './utils.js';

interface AriaHandlersConfig {
    ariaValues: (values: string) => string;
    ariaListOpen: (label: string, count: number) => string;
    ariaFocused: () => string;
    ariaEmpty?: () => string;
    ariaLoading?: () => string;
}

interface AriaHandlersContext {
    value: string | SelectItem | (SelectItem | string)[] | null | undefined;
    filteredItems: SelectItem[];
    hoverItemIndex: number;
    listOpen: boolean;
    multiple: boolean;
    label: string;
    loading?: boolean;
}

export function useAriaHandlers(config: AriaHandlersConfig) {
    // Read the config properties at call time so live getters (see Select.svelte) stay reactive
    function handleAriaSelection(context: AriaHandlersContext): string {
        const { value, multiple, label } = context;

        // An empty array is no selection: announcing it would claim one exists
        if (!value || (Array.isArray(value) && value.length === 0)) return '';

        let selected: string | undefined = undefined;

        if (typeof value === 'string') {
            selected = value;
        } else if (multiple && Array.isArray(value) && value.length > 0) {
            selected = (value as SelectItem[]).map((v) => v[label]).join(', ');
        } else if (!multiple && value) {
            selected = (value as SelectItem)[label] as string | undefined;
        }

        return config.ariaValues(selected || '');
    }

    function handleAriaContent(context: AriaHandlersContext): string {
        const { filteredItems, hoverItemIndex, listOpen, label, loading } = context;

        if (!filteredItems || filteredItems.length === 0) {
            // The visible list shows a loading/empty state here; silence would leave
            // screen-reader users unable to tell pending results from no results
            if (listOpen) {
                return loading ? (config.ariaLoading?.() ?? 'Loading Data') : (config.ariaEmpty?.() ?? 'No options');
            }
            return '';
        }

        const _item = filteredItems[hoverItemIndex];

        if (listOpen && _item) {
            // Presentational group headers are aria-hidden and unreachable by the
            // cursor, so counting them would announce more "results" than a
            // screen-reader user can ever reach. Selectable headers
            // (groupHeaderSelectable) are real options and do count.
            const count = filteredItems.filter((item) => !(item.groupHeader && !item.selectable)).length;
            // This text renders before use-hover's keep-hover-selectable
            // correction runs, so on the first open of a grouped list the cursor
            // is still parked on a non-selectable header. Announce the option the
            // correction is about to land on (the first selectable row — the same
            // index checkHoverSelectable computes) instead of a row the cursor can
            // never reach; the region won't recompute after the correction because
            // hoverItemIndex is deliberately untracked (see Select.svelte).
            const announced = isItemSelectableCheck(_item)
                ? _item
                : (filteredItems.find(isItemSelectableCheck) ?? _item);
            return config.ariaListOpen(announced[label] as string, count);
        } else {
            return config.ariaFocused();
        }
    }

    return {
        handleAriaSelection,
        handleAriaContent,
    };
}
