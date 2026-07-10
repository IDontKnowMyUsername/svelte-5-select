import { untrack } from 'svelte';
import type { JustValue, SelectItem, SelectState, ValueActions } from './types';
import { getItemProperty, hasValueChanged } from './utils';

export function useValue<Item extends SelectItem = SelectItem>(state: SelectState<Item>, actions: ValueActions) {
    function findItemByValue(id: unknown): Item | undefined {
        const { items, itemId } = state;
        return (items as Item[] | null)?.find((item) => getItemProperty(item, itemId) === id);
    }

    // Normalizes raw string values into items, resolving against `items` when possible
    function normalizeValue() {
        const { value, multiple, itemId } = state;
        if (typeof value === 'string') {
            state.value = findItemByValue(value) || ({ [itemId]: value, label: value } as Item);
        } else if (multiple && Array.isArray(value) && value.length > 0) {
            state.value = (value as (Item | string)[]).map((val) => {
                if (typeof val === 'string') {
                    return findItemByValue(val) || ({ value: val, label: val } as Item);
                }
                return val;
            });
        }
    }

    // Command: when an initial justValue is supplied without a value, resolve it against items and set value
    function hydrateValueFromJustValue(): void {
        const { multiple, value, itemId, useJustValue, justValue, clearState } = state;

        const hasJustValue = multiple
            ? Array.isArray(justValue) && justValue.length > 0
            : justValue !== '' && justValue != null;

        if (!useJustValue || value || clearState || !hasJustValue) return;

        const typedItems = (state.items as Item[] | null) || [];
        if (multiple && Array.isArray(justValue)) {
            const justValueArr = justValue as (string | number)[];
            state.value = typedItems.filter((item) =>
                justValueArr.includes(getItemProperty(item, itemId) as string | number),
            );
        } else {
            state.value = typedItems.filter((item) => getItemProperty(item, itemId) === justValue)[0];
        }
    }

    // Query: pure derivation of justValue from a state snapshot
    function deriveJustValue(
        snapshot: Pick<
            SelectState<Item>,
            'multiple' | 'value' | 'itemId' | 'useJustValue' | 'justValue' | 'clearState'
        >,
    ): JustValue | undefined {
        const { multiple, value, itemId, useJustValue, justValue, clearState } = snapshot;

        if (useJustValue && !value && !clearState) {
            return justValue;
        }

        if (multiple && Array.isArray(value)) {
            return (value as (SelectItem | string)[]).map((item) => getItemProperty(item, itemId)) as
                | string[]
                | number[];
        }

        if (!value || typeof value === 'string' || Array.isArray(value)) {
            return value as JustValue | undefined;
        }

        return getItemProperty(value, itemId) as JustValue;
    }

    function syncJustValue(): JustValue | undefined {
        // Snapshot before hydration so the derivation sees the pre-hydration state
        const snapshot = {
            multiple: state.multiple,
            value: state.value,
            itemId: state.itemId,
            useJustValue: state.useJustValue,
            justValue: state.justValue,
            clearState: state.clearState,
        };
        hydrateValueFromJustValue();
        state.clearState = false;
        return deriveJustValue(snapshot);
    }

    function checkValueForDuplicates(): boolean {
        const { value, itemId } = state;
        if (!Array.isArray(value) || value.length === 0) return true;

        // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local dedup scratch, not reactive state
        const seen = new Set<unknown>();
        const uniqueValues = (value as (Item | string)[]).filter((val) => {
            const id = getItemProperty(val, itemId);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        const noDuplicates = uniqueValues.length === value.length;
        if (!noDuplicates) state.value = uniqueValues as Item[] | string[];

        return noDuplicates;
    }

    function dispatchSelectedItem() {
        const { multiple, value, prevValue, itemId } = state;

        if (!value) {
            if (prevValue) actions.oninput([]);
            state.prevValue = value;
            return;
        }

        if (multiple) {
            if (hasValueChanged(value, prevValue, itemId) && checkValueForDuplicates()) {
                actions.oninput(value);
            }
        } else if (!prevValue || hasValueChanged(value, prevValue, itemId)) {
            actions.oninput(value);
        }

        state.prevValue = value;
    }

    function setupMulti() {
        const { value } = state;
        if (value) {
            if (Array.isArray(value)) {
                state.value = [...value] as Item[] | string[];
            } else {
                // A raw string value stays a string here; normalizeValue resolves it to an item
                state.value = [value] as Item[] | string[];
            }
        }
    }

    async function handleMultiItemClear(i: number): Promise<void> {
        const { value } = state;
        if (!Array.isArray(value)) return;

        const itemToRemove = value[i];

        state.clearState = true;
        if (value.length === 1) {
            state.value = undefined;
        } else {
            state.value = (value as (Item | string)[]).filter((item) => item !== itemToRemove) as Item[] | string[];
        }
        actions.onclear(itemToRemove);
    }

    function itemSelected(selection: SelectItem) {
        if (!selection) return;
        const { multiple, value, closeListOnChange } = state;

        state.filterText = '';
        const item = { ...selection } as Item;

        if (item.groupHeader && !item.selectable) return;

        state.value = multiple ? (value ? (value as Item[]).concat([item]) : [item]) : item;

        if (closeListOnChange) actions.closeList();
        state.activeValue = undefined;
        actions.onchange(state.value);
        actions.onselect(selection);
    }

    // Normalize string values against items whenever hasValue flips
    $effect(() => {
        state.hasValue;
        untrack(() => {
            if (state.items) normalizeValue();
        });
    });

    // Multiple-mode transitions (single<->multi) and duplicate guard
    $effect(() => {
        state.multiple;
        const value = state.value;
        if (Array.isArray(value)) value.length; // also track in-place growth of a bound array
        untrack(() => {
            const wasMultiple = state.prevMultiple;
            state.prevMultiple = state.multiple;
            if (state.multiple !== wasMultiple) {
                if (state.multiple) {
                    setupMulti();
                } else if (wasMultiple && state.value) {
                    state.value = null;
                    return;
                }
            }
            if (state.multiple && Array.isArray(state.value) && state.value.length > 1) {
                checkValueForDuplicates();
            }
        });
    });

    // Dispatch oninput when value changes (selection, update, or clear)
    $effect(() => {
        state.value;
        untrack(() => dispatchSelectedItem());
    });

    // Hydrate value from an initial justValue, then keep justValue in sync
    $effect(() => {
        state.multiple;
        state.itemId;
        state.value;
        untrack(() => {
            state.justValue = syncJustValue();
        });
    });

    return {
        itemSelected,
        handleMultiItemClear,
    };
}
