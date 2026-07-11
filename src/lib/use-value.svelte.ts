import { untrack } from 'svelte';
import type { JustValue, SelectItem, SelectState, ValueActions } from './types';
import { getItemProperty, hasValueChanged } from './utils';

export function useValue<Item extends SelectItem = SelectItem>(state: SelectState<Item>, actions: ValueActions) {
    function findItemByValue(id: unknown): Item | undefined {
        const { items, itemId } = state;
        return (items as Item[] | null)?.find((item) => getItemProperty(item, itemId) === id);
    }

    // Exactly the shape synthesized below: an id-as-label item with no other keys
    function isSynthesizedFallback(entry: Item): boolean {
        const id = getItemProperty(entry, state.itemId);
        if (id == null || id !== (entry as SelectItem).label) return false;
        return Object.keys(entry).every((key) => key === state.itemId || key === 'label');
    }

    // Comparisons here must be structural: Svelte's state proxies mean an item
    // written into `value` is never identical (===) to the same item re-read
    // from `items`, so an identity check would re-write (and loop) forever
    function shallowEqualItems(a: Item, b: Item): boolean {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        return aKeys.length === bKeys.length && aKeys.every((key) => (a as SelectItem)[key] === (b as SelectItem)[key]);
    }

    // Resolves one value entry: a raw string becomes the matching item, or a
    // synthesized fallback (label = id) so the control can render before items
    // load; an earlier fallback upgrades to the real item once it exists.
    function resolveEntry(entry: Item | string): Item {
        const { itemId } = state;
        if (typeof entry === 'string') {
            return findItemByValue(entry) || ({ [itemId]: entry, label: entry } as Item);
        }
        if (isSynthesizedFallback(entry)) {
            const found = findItemByValue(getItemProperty(entry, itemId));
            if (found && !shallowEqualItems(found, entry)) return found;
        }
        return entry;
    }

    // Normalizes raw string values into items, resolving against `items` when
    // possible. Only writes when an entry actually changed — the effect below
    // tracks `value`, so an unconditional write would loop.
    function normalizeValue() {
        const { value, multiple } = state;
        if (value == null) return;

        if (multiple && Array.isArray(value)) {
            if (value.length === 0) return;
            const resolved = (value as (Item | string)[]).map(resolveEntry);
            if (resolved.some((item, i) => item !== value[i])) {
                state.value = resolved;
            }
        } else if (!Array.isArray(value)) {
            const resolved = resolveEntry(value as Item | string);
            if (resolved !== value) state.value = resolved;
        }
    }

    // Command: when an initial justValue is supplied without a value, resolve it against items and set value
    function hydrateValueFromJustValue(): void {
        const { multiple, value, itemId, useJustValue, justValue, clearState } = state;

        const hasJustValue = multiple
            ? Array.isArray(justValue) && justValue.length > 0
            : justValue !== '' && justValue != null;

        // An empty array means "nothing hydrated yet", not a real selection —
        // hydration must still run once async items arrive
        const hasRealValue = multiple ? Array.isArray(value) && value.length > 0 : !!value;
        if (!useJustValue || hasRealValue || clearState || !hasJustValue) return;

        // Hydration is all-or-nothing and retries when items change: writing a
        // partial (or empty) match would silently narrow justValue and block
        // later hydration against fuller items
        const typedItems = (state.items as Item[] | null) || [];
        if (multiple && Array.isArray(justValue)) {
            const justValueArr = justValue as (string | number)[];
            const matches = typedItems.filter((item) =>
                justValueArr.includes(getItemProperty(item, itemId) as string | number),
            );
            if (matches.length === justValueArr.length) state.value = matches;
        } else {
            const match = typedItems.find((item) => getItemProperty(item, itemId) === justValue);
            if (match) state.value = match;
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
            // Raw string entries key on the string itself: getItemProperty returns
            // undefined for non-objects, which would collapse all strings into one
            const id = typeof val === 'string' ? val : getItemProperty(val, itemId);
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

    // Normalize string values on every value change (not just the hasValue
    // flip — replacing one string with another must re-resolve), and again when
    // async items arrive so fallback entries upgrade to the real item
    $effect(() => {
        state.value;
        state.items;
        untrack(() => normalizeValue());
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

    // Hydrate value from an initial justValue, then keep justValue in sync.
    // items is a tracked trigger so hydration retries when async items arrive.
    $effect(() => {
        state.multiple;
        state.itemId;
        state.value;
        state.items;
        untrack(() => {
            state.justValue = syncJustValue();
        });
    });

    return {
        itemSelected,
        handleMultiItemClear,
    };
}
