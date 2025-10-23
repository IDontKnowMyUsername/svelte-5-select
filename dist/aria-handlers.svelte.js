export function useAriaHandlers(config) {
    const { ariaValues, ariaListOpen, ariaFocused } = config;
    function handleAriaSelection(context) {
        const { value, multiple, label } = context;
        if (!value)
            return '';
        let selected = undefined;
        if (typeof value === 'string') {
            selected = value;
        }
        else if (multiple && Array.isArray(value) && value.length > 0) {
            selected = value.map((v) => v[label]).join(', ');
        }
        else if (!multiple && value) {
            selected = value[label];
        }
        return ariaValues(selected || '');
    }
    function handleAriaContent(context) {
        const { filteredItems, hoverItemIndex, listOpen, label } = context;
        if (!filteredItems || filteredItems.length === 0)
            return '';
        const _item = filteredItems[hoverItemIndex];
        if (listOpen && _item) {
            const count = filteredItems.length;
            return ariaListOpen(_item[label], count);
        }
        else {
            return ariaFocused();
        }
    }
    return {
        handleAriaSelection,
        handleAriaContent,
    };
}
