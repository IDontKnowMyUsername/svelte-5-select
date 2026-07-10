import type { SelectItem } from './types';

interface AriaHandlersConfig {
    ariaValues: (values: string) => string;
    ariaListOpen: (label: string, count: number) => string;
    ariaFocused: () => string;
}

interface AriaHandlersContext {
    value: string | SelectItem | SelectItem[] | null | undefined;
    filteredItems: SelectItem[];
    hoverItemIndex: number;
    listOpen: boolean;
    multiple: boolean;
    label: string;
}

export function useAriaHandlers(config: AriaHandlersConfig) {
    // Read the config properties at call time so live getters (see Select.svelte) stay reactive
    function handleAriaSelection(context: AriaHandlersContext): string {
        const { value, multiple, label } = context;

        if (!value) return '';

        let selected: string | undefined = undefined;

        if (typeof value === 'string') {
            selected = value;
        } else if (multiple && Array.isArray(value) && value.length > 0) {
            selected = value.map((v: SelectItem) => v[label]).join(', ');
        } else if (!multiple && value) {
            selected = (value as SelectItem)[label];
        }

        return config.ariaValues(selected || '');
    }

    function handleAriaContent(context: AriaHandlersContext): string {
        const { filteredItems, hoverItemIndex, listOpen, label } = context;

        if (!filteredItems || filteredItems.length === 0) return '';

        const _item = filteredItems[hoverItemIndex];

        if (listOpen && _item) {
            const count = filteredItems.length;
            return config.ariaListOpen(_item[label], count);
        } else {
            return config.ariaFocused();
        }
    }

    return {
        handleAriaSelection,
        handleAriaContent,
    };
}
