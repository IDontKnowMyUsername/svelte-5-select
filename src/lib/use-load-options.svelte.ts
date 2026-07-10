import { untrack } from 'svelte';
import type { LoadOptionsActions, SelectItem, SelectState } from './types';
import { convertStringItemsToObjects, getItemProperty } from './utils';

export function useLoadOptions<Item extends SelectItem = SelectItem>(
    state: SelectState<Item>,
    actions: LoadOptionsActions,
) {
    // Monotonic token so responses that resolve after a newer request started are discarded
    let requestSequence = 0;

    function handleLoadOptions(currentFilterText: string) {
        const { loadOptions, disabled, prevFilterText, debounceWait, listOpen } = state;

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

                    if (value && items && items.length > 0) {
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
                    } else if (value && (!items || items.length === 0)) {
                        state.value = multiple ? [] : undefined;
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

            if (currentFilterText.length > 0 && !listOpen) {
                state.listOpen = true;
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

    // Run loadOptions when its inputs change. listOpen and disabled stay tracked on
    // purpose: opening the list re-fetches, and disabling clears the loaded state.
    $effect(() => {
        const currentFilterText = state.filterText;
        [...state.loadOptionsDeps];

        if (state.loadOptions) {
            untrack(() => {
                handleLoadOptions(currentFilterText);
            });

            if (!state.disabled && currentFilterText.length > 0 && !state.listOpen) {
                state.listOpen = true;
            }
        }
    });

    return {
        handleLoadOptions,
    };
}
