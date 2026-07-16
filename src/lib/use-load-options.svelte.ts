import { untrack } from 'svelte';
import { DEV } from 'esm-env';
import type { ItemLike, LoadOptionsActions, SelectItem, SelectState } from './types';
import { convertStringItemsToObjects, getItemProperty } from './utils';

export interface HandleLoadOptionsOptions {
    /**
     * Validate the selection against the loaded items (dependency-driven reloads):
     * entries missing from a non-empty result are dropped; an empty result is no
     * evidence and never clears.
     */
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
    // Filter text of the newest armed/in-flight load while it is live; cleared
    // once it settles. Lets the effect tell "shown results are stale for this
    // text" from "a load for this text is already on its way" — mounting with
    // an initial filterText opens the list after the mount fetch is armed, and
    // that open must not fire a duplicate fetch.
    let liveLoadFilterText: string | undefined = undefined;

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
            liveLoadFilterText = currentFilterText;

            // Only a dependency-driven reload invalidates the selection: when a
            // parent select changes, a stale child value must clear. A
            // filter-driven load merely narrows the results and must not wipe
            // a selection that happens to fall outside them.
            const validateValueAgainstLoaded = (loaded: readonly (SelectItem | string)[] | null) => {
                // Re-read state after the async boundary
                const { value, multiple, itemId, useJustValue } = state;
                if (!value) return;

                // An empty (or null) result is no evidence about validity: the
                // reload queries with the retained filter text (usually '' after
                // a selection), and a search endpoint returns nothing for an
                // empty query regardless of the selection. Only a non-empty
                // result can prove an entry stale, so only it may clear.
                if (!loaded || loaded.length === 0) return;

                const idOf = (entry: SelectItem | string) =>
                    typeof entry === 'string' ? entry : getItemProperty(entry, itemId);
                const existsInLoaded = (v: SelectItem | string) => loaded.some((item) => idOf(item) === idOf(v));

                // One empty representation, matching every other clear path (the
                // clear button, the last tag removed, a multi->single transition):
                // `undefined` in both modes, never `null` or `[]`.
                const clearInvalidatedValue = () => {
                    state.value = undefined;
                    if (useJustValue) state.justValue = undefined;
                };

                if (multiple && Array.isArray(value)) {
                    // Drop only provably stale entries; entries the reload still
                    // offers survive (justValue re-derives from the value write)
                    const survivors = (value as (Item | string)[]).filter(existsInLoaded);
                    if (survivors.length === 0) {
                        clearInvalidatedValue();
                    } else if (survivors.length !== value.length) {
                        state.value = survivors as Item[] | string[];
                    }
                } else if (!existsInLoaded(value as SelectItem | string)) {
                    clearInvalidatedValue();
                }
            };

            const executeLoad = async () => {
                // Cancelled or superseded while waiting in the debounce queue: never fetch
                if (token !== requestSequence) return;
                // Re-read the loader at fire time: the prop can be swapped (or
                // removed) during the debounce wait, and the closure captured at
                // arm time would run the old fetcher and attribute its response
                // to the new prop
                const load = state.loadOptions;
                if (!load) {
                    liveLoadFilterText = undefined;
                    state.loading = false;
                    return;
                }
                try {
                    const result = await load(currentFilterText);
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
                    liveLoadFilterText = undefined;

                    if (validateValue) validateValueAgainstLoaded(state.items);

                    state.loading = false;
                    actions.onloaded((state.items as SelectItem[]) || []);
                } catch (err) {
                    if (token !== requestSequence) return; // superseded; the newer request manages state
                    // Settled (with an error), so no longer live — a reopen may retry it
                    liveLoadFilterText = undefined;
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

    // Dev-only, once per instance: deps elements are compared by identity, so an
    // inline object/array literal recreated per parent render re-fires the reload
    // (and its value validation) on every render.
    let warnedAboutDepsIdentity = false;
    function warnIfDepsChangedByIdentityOnly(deps: unknown[], prevDeps: unknown[]): void {
        if (warnedAboutDepsIdentity) return;
        try {
            if (JSON.stringify(deps) !== JSON.stringify(prevDeps)) return;
        } catch {
            return; // non-serializable deps: skip the heuristic
        }
        warnedAboutDepsIdentity = true;
        console.warn(
            '[svelte-select] loadOptionsDeps changed by identity but not by content. Deps elements ' +
                'are compared with ===, so an object or array literal created inline re-triggers the ' +
                'reload — and its selection validation — on every parent render. Pass primitives ' +
                '(e.g. the id itself) or stable references instead.',
        );
    }

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
        if (DEV && depsChanged) warnIfDepsChangedByIdentityOnly(deps, prev.deps);
        const filterTextChanged = !isFirstRun && filterText !== prev.filterText;
        const disabledChanged = !isFirstRun && disabled !== prev.disabled;
        // A genuine closed->open transition (not a typing-open, where filterText
        // also changed) that reveals results stale for the retained filter text.
        // An armed or in-flight load for the same text (mount with an initial
        // filterText opens the list right after the mount fetch) is not stale —
        // its response is already on the way.
        const loadIsLiveForText = armedToken === requestSequence && liveLoadFilterText === filterText;
        const reopenedStale =
            !isFirstRun &&
            listOpen &&
            !prev.listOpen &&
            !filterTextChanged &&
            !disabled &&
            filterText.length > 0 &&
            filterText !== loadedFilterText &&
            !loadIsLiveForText;

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
