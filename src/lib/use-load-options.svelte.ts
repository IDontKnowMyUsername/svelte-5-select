import { untrack } from 'svelte';
import type { LoadOptionsActions, SelectItem, SelectState } from './types';
import { convertStringItemsToObjects, getItemProperty } from './utils';

export function useLoadOptions<Item extends SelectItem = SelectItem>(
    state: SelectState<Item>,
    actions: LoadOptionsActions,
) {
    // Monotonic token so responses that resolve after a newer request started are discarded
    let requestSequence = 0;

    function handleLoadOptions(currentFilterText: string, options: { validateValue?: boolean } = {}) {
        const { loadOptions, disabled, prevFilterText, debounceWait } = state;
        const { validateValue = false } = options;

        if (loadOptions && !disabled) {
            state.loading = true;

            const token = ++requestSequence;
            const isFilterTextChange = currentFilterText !== prevFilterText;

            const executeLoad = async () => {
                try {
                    const result = await loadOptions(currentFilterText);
                    if (token !== requestSequence) return; // superseded by a newer request

                    if (result && result.length > 0 && typeof result[0] === 'string') {
                        state.items = convertStringItemsToObjects(result as string[]) as Item[];
                    } else {
                        state.items = result ? (result.slice() as Item[]) : null;
                    }

                    // Re-read state after the async boundary
                    const { value, items, multiple, itemId, useJustValue } = state;

                    // Only a dependency-driven reload invalidates the selection: when a
                    // parent select changes, a stale child value must clear. A
                    // filter-driven load merely narrows the results and must not wipe
                    // a selection that happens to fall outside them.
                    if (validateValue && value) {
                        if (items && items.length > 0) {
                            const idOf = (entry: SelectItem | string) =>
                                typeof entry === 'string' ? entry : getItemProperty(entry, itemId);
                            const valueExists = multiple
                                ? Array.isArray(value) &&
                                  (value as (SelectItem | string)[]).every((v) =>
                                      items.some((item) => idOf(item) === idOf(v)),
                                  )
                                : items.some((item) => idOf(item) === idOf(value as SelectItem | string));

                            if (!valueExists) {
                                state.value = multiple ? [] : undefined;
                                if (useJustValue) {
                                    state.justValue = multiple ? [] : '';
                                }
                            }
                        } else {
                            state.value = multiple ? [] : undefined;
                        }
                    }

                    state.loading = false;
                    actions.onloaded((state.items as SelectItem[]) || []);
                } catch (err) {
                    if (token !== requestSequence) return; // superseded; the newer request manages state
                    console.error('loadOptions error:', err);
                    actions.onerror({ type: 'loadOptions', details: err });
                    state.items = null;
                    state.loading = false;
                }
            };

            if (isFilterTextChange) {
                actions.debounce(executeLoad, debounceWait);
            } else {
                executeLoad();
            }
        } else if (loadOptions && disabled) {
            if (state.value || (state.useJustValue && state.justValue)) {
                state.value = state.multiple ? [] : undefined;
                if (state.useJustValue) {
                    state.justValue = state.multiple ? [] : '';
                }
            }
            state.items = null;
        }
    }

    // Snapshot of the previous effect run so it can tell WHICH input changed
    let prevRun: { filterText: string; deps: unknown[]; disabled: boolean } | undefined;

    // Run loadOptions when its inputs change: typing non-empty filter text
    // re-queries, a loadOptionsDeps change re-queries and re-validates the value,
    // and toggling disabled clears or reloads the loaded state. listOpen is
    // deliberately NOT an input — opening or closing the list must never fetch,
    // and clearing the filter text on close must not fire a loadOptions('').
    $effect(() => {
        const filterText = state.filterText;
        const deps = [...state.loadOptionsDeps];
        const disabled = state.disabled;

        if (!state.loadOptions) return;

        const prev = prevRun;
        prevRun = { filterText, deps, disabled };

        const isFirstRun = prev === undefined;
        const depsChanged =
            !isFirstRun && (deps.length !== prev.deps.length || deps.some((dep, i) => dep !== prev.deps[i]));
        const filterTextChanged = !isFirstRun && filterText !== prev.filterText;
        const disabledChanged = !isFirstRun && disabled !== prev.disabled;

        if (isFirstRun || depsChanged || disabledChanged || (filterTextChanged && filterText.length > 0)) {
            untrack(() => handleLoadOptions(filterText, { validateValue: depsChanged }));
        }
    });

    return {
        handleLoadOptions,
    };
}
