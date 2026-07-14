import { untrack } from 'svelte';
import type { ItemLike, LoadOptionsActions, SelectItem, SelectState } from './types';
import { convertStringItemsToObjects, getItemProperty } from './utils';

export interface HandleLoadOptionsOptions {
    /** Clear the selection when it is missing from the loaded items (dependency-driven reloads). */
    validateValue?: boolean;
    /** Defer the fetch through the debounce action (typing); defaults to the legacy prevFilterText comparison. */
    debounce?: boolean;
    /** Clear value/items in the disabled branch; the load effect only passes true on an actual disabled transition. */
    clearValueOnDisabled?: boolean;
}

export function useLoadOptions<Item extends ItemLike = SelectItem>(
    state: SelectState<Item>,
    actions: LoadOptionsActions,
) {
    // Monotonic token so responses that resolve after a newer request started are discarded
    let requestSequence = 0;
    // Whether the newest armed/in-flight load came from typing; only those may be
    // cancelled by selection or list close — dependency reloads must still land
    let latestLoadIsFilterDriven = false;
    // Token of the newest ARMED load and whether it validates the value. A
    // dependency reload superseded by a plain filter load must still deliver its
    // validation verdict (its response is authoritative for the deps change),
    // while a newer validating load owns the verdict itself, and plain
    // invalidation (disable, unmount, cancel) must deliver nothing.
    let armedToken = 0;
    let armedLoadValidates = false;

    // The filter text the currently-displayed items reflect (set when a load
    // settles). Lets a reopen tell "results are stale for the current text" from
    // "results already match", so only the former re-fetches.
    let loadedFilterText: string | undefined = undefined;

    // Invalidate every pending and in-flight load: a pending one never fetches,
    // an in-flight response is discarded. Does not touch reactive state, so it
    // is safe to call during component teardown.
    function invalidateLoads(): void {
        requestSequence++;
        latestLoadIsFilterDriven = false;
    }

    // A filter-driven load becomes moot when the user selects an item, empties
    // the filter text, or closes the list before the debounce fires.
    function cancelPendingFilterLoad(): void {
        if (!latestLoadIsFilterDriven) return;
        invalidateLoads();
        if (state.loading) state.loading = false;
    }

    function handleLoadOptions(currentFilterText: string, options: HandleLoadOptionsOptions = {}) {
        const { loadOptions, disabled, prevFilterText, debounceWait } = state;
        const {
            validateValue = false,
            debounce: shouldDebounce = currentFilterText !== prevFilterText,
            clearValueOnDisabled = true,
        } = options;

        if (loadOptions && !disabled) {
            state.loading = true;

            const token = ++requestSequence;
            armedToken = token;
            armedLoadValidates = validateValue;
            latestLoadIsFilterDriven = shouldDebounce;

            // Only a dependency-driven reload invalidates the selection: when a
            // parent select changes, a stale child value must clear. A
            // filter-driven load merely narrows the results and must not wipe
            // a selection that happens to fall outside them.
            const validateValueAgainstLoaded = (loaded: readonly (SelectItem | string)[] | null) => {
                // Re-read state after the async boundary
                const { value, multiple, itemId, useJustValue } = state;
                if (!value) return;

                // One empty representation, matching every other clear path (the
                // clear button, the last tag removed, a multi->single transition):
                // `undefined` in both modes, never `null` or `[]`.
                const clearInvalidatedValue = () => {
                    state.value = undefined;
                    if (useJustValue) state.justValue = undefined;
                };

                if (loaded && loaded.length > 0) {
                    const idOf = (entry: SelectItem | string) =>
                        typeof entry === 'string' ? entry : getItemProperty(entry, itemId);
                    const valueExists = multiple
                        ? Array.isArray(value) &&
                          (value as (SelectItem | string)[]).every((v) => loaded.some((item) => idOf(item) === idOf(v)))
                        : loaded.some((item) => idOf(item) === idOf(value as SelectItem | string));

                    if (!valueExists) {
                        clearInvalidatedValue();
                    }
                } else {
                    clearInvalidatedValue();
                }
            };

            const executeLoad = async () => {
                // Cancelled or superseded while waiting in the debounce queue: never fetch
                if (token !== requestSequence) return;
                try {
                    const result = await loadOptions(currentFilterText);
                    if (token !== requestSequence) {
                        // Superseded by a newer request: the response must not land, but a
                        // dependency reload's validation verdict still applies to the deps
                        // change — unless a newer armed load validates on its own.
                        if (validateValue && armedToken === requestSequence && !armedLoadValidates) {
                            validateValueAgainstLoaded(result ?? null);
                        }
                        return;
                    }

                    if (result && result.length > 0 && typeof result[0] === 'string') {
                        state.items = convertStringItemsToObjects(result as string[]) as Item[];
                    } else {
                        state.items = result ? (result.slice() as Item[]) : null;
                    }
                    // Displayed items now reflect this filter text — a reopen with
                    // the same text won't refetch
                    loadedFilterText = currentFilterText;

                    if (validateValue) validateValueAgainstLoaded(state.items);

                    state.loading = false;
                    actions.onloaded((state.items as SelectItem[]) || []);
                } catch (err) {
                    if (token !== requestSequence) return; // superseded; the newer request manages state
                    console.error('loadOptions error:', err);
                    actions.onerror({ type: 'loadOptions', details: err });
                    state.items = null;
                    // Deliberately leave loadedFilterText unchanged: an errored load
                    // did not produce results for this text, so a reopen should
                    // retry it (a transient failure then recovers). No loop risk —
                    // a reopen is a manual gesture, so it retries at most once each.
                    state.loading = false;
                }
            };

            if (shouldDebounce) {
                actions.debounce(executeLoad, debounceWait);
            } else {
                executeLoad();
            }
        } else if (loadOptions && disabled) {
            // A response arriving after the disable must not repopulate the control
            invalidateLoads();
            if (state.loading) state.loading = false;

            if (clearValueOnDisabled) {
                if (state.value || (state.useJustValue && state.justValue)) {
                    // `undefined` in both modes — see clearInvalidatedValue above
                    state.value = undefined;
                    if (state.useJustValue) {
                        state.justValue = undefined;
                    }
                }
                state.items = null;
            }
        }
    }

    // Snapshot of the previous effect run so it can tell WHICH input changed
    let prevRun: { filterText: string; deps: unknown[]; disabled: boolean; listOpen: boolean } | undefined;

    // Run loadOptions when its inputs change: typing non-empty filter text
    // re-queries (debounced), a loadOptionsDeps change re-queries and re-validates
    // the value, and toggling disabled clears or reloads the loaded state; mount,
    // deps, and disabled loads fire immediately. listOpen only matters for the
    // reopen-stale case below — opening or closing the list otherwise never fetches,
    // and clearing the filter text on close must not fire a loadOptions('').
    $effect(() => {
        const filterText = state.filterText;
        const deps = [...state.loadOptionsDeps];
        const disabled = state.disabled;
        const listOpen = state.listOpen;

        if (!state.loadOptions) return;

        const prev = prevRun;
        prevRun = { filterText, deps, disabled, listOpen };

        const isFirstRun = prev === undefined;
        const depsChanged =
            !isFirstRun && (deps.length !== prev.deps.length || deps.some((dep, i) => dep !== prev.deps[i]));
        const filterTextChanged = !isFirstRun && filterText !== prev.filterText;
        const disabledChanged = !isFirstRun && disabled !== prev.disabled;
        // A genuine closed->open transition (not a typing-open, where filterText
        // also changed) that reveals results stale for the retained filter text.
        const reopenedStale =
            !isFirstRun &&
            listOpen &&
            !prev.listOpen &&
            !filterTextChanged &&
            !disabled &&
            filterText.length > 0 &&
            filterText !== loadedFilterText;

        if (isFirstRun || depsChanged || disabledChanged || (filterTextChanged && filterText.length > 0)) {
            untrack(() =>
                handleLoadOptions(filterText, {
                    validateValue: depsChanged,
                    debounce: filterTextChanged && !depsChanged && !disabledChanged,
                    clearValueOnDisabled: disabledChanged,
                }),
            );
        } else if (reopenedStale) {
            // Reopened with retained filter text whose load was cancelled on close
            // (clearFilterTextOnBlur=false): the shown items are stale for this
            // text, so refresh immediately. A typing-open is handled by the branch
            // above (filterText changed → debounced); a pure reopen whose results
            // already match, an empty filter, and the initial mount never reach here.
            untrack(() => handleLoadOptions(filterText, { debounce: false }));
        } else if (filterTextChanged) {
            // Filter text was emptied: a load armed for the old text is moot now
            untrack(() => cancelPendingFilterLoad());
        }
    });

    return {
        handleLoadOptions,
        cancelPendingFilterLoad,
        invalidateLoads,
    };
}
