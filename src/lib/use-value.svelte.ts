import type { ValueContext, SelectItem, JustValue } from './types';
import { hasValueChanged } from './utils';

export function useValue(context: ValueContext) {
    function findItemByValue(id: string | number): SelectItem | undefined {
        const { items, itemId } = context.getState();
        return (items as SelectItem[])?.find(item => item[itemId] === id);
    }

    function findItem(selection?: SelectItem): SelectItem | undefined {
        const { normalizedValue, items, itemId } = context.getState();
        let matchTo = selection ? selection[itemId] : (normalizedValue as SelectItem)[itemId];
        return (items as SelectItem[])?.find(item => item[itemId] === matchTo);
    }

    function setValue() {
        const { value, multiple, itemId } = context.getState();
        context.setPrevValue(value);
        if (typeof value === 'string') {
            let item = findItemByValue(value);
            context.setValue(item || {
                [itemId]: value,
                label: value,
            });
        } else if (multiple && Array.isArray(value) && value.length > 0) {
            context.setValue(value.map((val: any) => {
                if (typeof val === 'string') {
                    let item = findItemByValue(val);
                    return item || { value: val, label: val };
                }
                return val;
            }));
        }
    }

    function updateValueDisplay(items?: SelectItem[] | string[] | null): void {
        const { value, itemId } = context.getState();
        if (!items || items.length === 0 || items.some((item: any) => typeof item !== 'object')) return;
        if (!value) return;

        if (Array.isArray(value)) {
            if (value.some((selection: SelectItem) => !selection || !(selection as Record<string, any>)[itemId])) return;
            context.setValue(value.map((selection: SelectItem) => findItem(selection) || selection));
        } else if (typeof value === 'object') {
            if (!(value as Record<string, any>)[itemId]) return;
            context.setValue(findItem() || value);
        }
    }

    function computeJustValue(): JustValue | undefined {
        const { multiple, value, itemId, useJustValue, justValue, clearState } = context.getState();

        const hasJustValue = multiple
            ? (Array.isArray(justValue) && justValue.length > 0)
            : (justValue !== '' && justValue != null);

        if (useJustValue && !value && !clearState && hasJustValue) {
            const { items } = context.getState();
            const typedItems = (items as SelectItem[]) || [];
            if (multiple && Array.isArray(justValue)) {
                const justValueArr = justValue as (string | number)[];
                context.setValue(typedItems.filter((item: SelectItem) =>
                    justValueArr.includes((item as Record<string, any>)[itemId])
                ));
            } else {
                context.setValue(typedItems.filter((item: SelectItem) =>
                    (item as Record<string, any>)[itemId] === justValue
                )[0]);
            }
        }

        const wasClearing = clearState;
        context.setClearState(false);

        if (useJustValue && !value && !wasClearing) {
            return justValue;
        }

        if (multiple && Array.isArray(value)) {
            return value.map((item: SelectItem) => item[itemId]);
        }

        if (!value || typeof value === 'string' || Array.isArray(value)) {
            return value as JustValue | undefined;
        }

        return value[itemId];
    }

    function checkValueForDuplicates(): boolean {
        const { value, itemId } = context.getState();
        if (!Array.isArray(value) || value.length === 0) return true;

        const seen = new Set();
        const uniqueValues = value.filter((val: SelectItem) => {
            const id = val[itemId];
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        const noDuplicates = uniqueValues.length === value.length;
        if (!noDuplicates) context.setValue(uniqueValues);

        return noDuplicates;
    }

    function dispatchSelectedItem() {
        const { multiple, value, prevValue, itemId } = context.getState();

        if (multiple) {
            if (hasValueChanged(value, prevValue)) {
                if (checkValueForDuplicates()) {
                    context.oninput(value || []);
                }
            }
            return;
        }

        if (!prevValue || hasValueChanged((value as SelectItem)[itemId], (prevValue as SelectItem)[itemId])) {
            context.oninput(value);
        }
    }

    function setupMulti() {
        const { value } = context.getState();
        if (value) {
            if (Array.isArray(value)) {
                context.setValue([...value]);
            } else {
                context.setValue([value]);
            }
        }
    }

    async function handleMultiItemClear(i: number): Promise<void> {
        const { value } = context.getState();
        if (!Array.isArray(value)) return;

        const itemToRemove = value[i];

        context.setClearState(true);
        if (value.length === 1) {
            context.setValue(undefined);
        } else {
            context.setValue(value.filter((item: SelectItem) => {
                return item !== itemToRemove;
            }));
        }
        context.onclear(itemToRemove);
    }

    function convertStringItemsToObjects(_items: string[]): SelectItem[] {
        return _items.map((item, index) => {
            return {
                index,
                value: item,
                label: `${item}`,
            };
        });
    }

    function itemSelected(selection: SelectItem) {
        const { multiple, value, closeListOnChange } = context.getState();
        if (selection) {
            context.setFilterText('');
            const item = Object.assign({}, selection);

            if (item.groupHeader && !item.selectable) return;
            setValue();
            updateValueDisplay(context.getState().items);
            context.setValue(multiple ? (value ? value.concat([item]) : [item]) : item);

            if (closeListOnChange) context.closeList();
            context.setActiveValue(undefined);
            context.onchange(context.getState().value);
            context.onselect(selection);
        }
    }

    return {
        setValue,
        updateValueDisplay,
        computeJustValue,
        checkValueForDuplicates,
        findItem,
        findItemByValue,
        dispatchSelectedItem,
        itemSelected,
        setupMulti,
        handleMultiItemClear,
        convertStringItemsToObjects,
    };
}
