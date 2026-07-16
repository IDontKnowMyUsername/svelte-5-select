import { untrack } from 'svelte';
import type { ItemLike, JustValue, SelectItem, SelectState, ValueActions } from './types';
import { getItemProperty, hasValueChanged } from './utils';

export function useValue<Item extends ItemLike = SelectItem>(state: SelectState<Item>, actions: ValueActions) {
    function findItemByValue(id: unknown): Item | undefined {
        const { items, itemId } = state;
        return (items as Item[] | null)?.find((item) => getItemProperty(item, itemId) === id);
    }

    // Exactly the shape synthesized below: an id-as-label item with no other keys
    function isSynthesizedFallback(entry: Item): boolean {
        const id = getItemProperty(entry, state.itemId);
        if (id == null || id !== getItemProperty(entry, state.label)) return false;
        return Object.keys(entry).every((key) => key === state.itemId || key === state.label);
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
        const { itemId, label } = state;
        if (typeof entry === 'string') {
            // The synthesized fallback is deliberately not a real Item — it only
            // carries enough shape to render until the matching item exists. It
            // must be keyed with the configured `label`, not a literal 'label':
            // the selection display reads `normalizedValue[label]`
            return findItemByValue(entry) || ({ [itemId]: entry, [label]: entry } as unknown as Item);
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

        if (!useJustValue || hasRealValue(multiple, value) || clearState || !hasJustValue) return;

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

    // Sync-loop scratch (deliberately non-reactive): lastSyncedHadValue tells an
    // external `bind:value` clear apart from "not hydrated yet", and
    // lastWrittenJustValue tells a justValue we derived ourselves (a stale echo
    // after such a clear) apart from fresh input that must hydrate.
    let lastSyncedHadValue = false;
    let lastWrittenJustValue: JustValue | undefined;

    function justValuesEqual(a: JustValue | undefined, b: JustValue | undefined): boolean {
        if (a === b) return true;
        // Proxied round trips break array identity; compare entries instead
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((entry, i) => entry === b[i]);
    }

    function hasRealValue(multiple: boolean, value: SelectState<Item>['value']): boolean {
        // An empty array means "nothing hydrated yet", not a real selection
        return multiple ? Array.isArray(value) && value.length > 0 : !!value;
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

        // A parent clearing `bind:value` directly must behave like an internal
        // clear: without this, hydration would resurrect the cleared selection
        // from the stale justValue echo written on a previous sync.
        const externallyCleared =
            !snapshot.clearState &&
            lastSyncedHadValue &&
            !hasRealValue(snapshot.multiple, snapshot.value) &&
            justValuesEqual(snapshot.justValue, lastWrittenJustValue);

        if (!externallyCleared) hydrateValueFromJustValue();
        state.clearState = false;
        lastSyncedHadValue = hasRealValue(state.multiple, state.value);

        const derived = deriveJustValue(externallyCleared ? { ...snapshot, clearState: true } : snapshot);
        lastWrittenJustValue = derived;
        return derived;
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
            // A cleared single select reports null: an empty array is truthy,
            // so `if (payload)` in consumers would read "cleared" as "has value"
            if (prevValue) actions.oninput(multiple ? [] : null);
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

        // Snapshot a copy of the settled (post-dedup) value: storing the live
        // array would alias prevValue to `value`, so an in-place push could
        // never register as a change
        const settled = state.value;
        state.prevValue = Array.isArray(settled) ? (settled.slice() as Item[] | string[]) : settled;
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
        const { multiple, value, closeListOnChange, itemId } = state;

        const item = { ...selection } as Item;

        if (item.groupHeader && !item.selectable) return;

        // Re-selecting an already-selected item in multiple mode is a no-op: the
        // value is a distinct set. Without this the item was concatenated and
        // onchange fired synchronously with a duplicate array ([a, a]) before a
        // later effect deduped state.value — leaving onchange disagreeing with the
        // (correctly suppressed) oninput. Single mode already no-ops the same way
        // in handleItemClick / handleEnterKey. The no-op runs before the
        // filterText wipe below: with filterSelectedItems={false} a re-click
        // selects nothing and must not clear what the user typed.
        if (multiple && Array.isArray(value)) {
            const selectedId = getItemProperty(item, itemId);
            const alreadySelected = (value as (Item | string)[]).some(
                (entry) => (typeof entry === 'string' ? entry : getItemProperty(entry, itemId)) === selectedId,
            );
            if (alreadySelected) {
                if (closeListOnChange) actions.closeList();
                state.activeValue = undefined;
                return;
            }
        }

        state.filterText = '';
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
        const value = state.value;
        if (Array.isArray(value)) value.length; // also track in-place growth of a bound array
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
                    // `undefined`, not `null`: an emptied value is `undefined`
                    // everywhere else (clear button, last tag removed, a deps
                    // reload invalidating the selection), and one empty
                    // representation is the whole contract
                    state.value = undefined;
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
        const value = state.value;
        if (Array.isArray(value)) value.length; // also track in-place growth of a bound array
        untrack(() => dispatchSelectedItem());
    });

    // Hydrate value from an initial justValue, then keep justValue in sync.
    // items is a tracked trigger so hydration retries when async items arrive.
    // clearState is a tracked trigger too, so an explicit clear always reaches
    // syncJustValue (which consumes and resets the flag) even when it is not
    // accompanied by a value change — otherwise the flag could stick `true` and
    // block the next hydration. syncJustValue resets it to `false`, which settles
    // in one extra run (the false→false write no longer notifies).
    $effect(() => {
        state.multiple;
        state.itemId;
        const value = state.value;
        if (Array.isArray(value)) value.length; // also track in-place growth of a bound array
        state.items;
        state.clearState;
        untrack(() => {
            state.justValue = syncJustValue();
        });
    });

    return {
        itemSelected,
        handleMultiItemClear,
    };
}
