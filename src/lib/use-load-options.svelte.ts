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
    // Token of the newest validating (dependency-driven) load while it is
    // unsettled; 0 otherwise. If a filter load that superseded it is cancelled,
    // the deps reload is the most relevant request again and must get its full
    // authority back — see restoredToken.
    let liveValidatingToken = 0;
    // A load allowed to land in full despite no longer being the newest request:
    // cancelPendingFilterLoad hands currency back to the in-flight deps reload
    // the cancelled load superseded. Without this, closing the list during a
    // deps reload discarded both the reload's items and its validation verdict,
    // leaving stale options and an unvalidated stale selection (the reopen-stale
    // heuristic could re-fetch the items later, but never the verdict).
    let restoredToken = 0;
    // Token of the newest load whose response fully landed (items written).
    // Lets a user selection tell whether the options it was picked from are
    // fresher than a still-pending validating reload — see
    // retireValidationForFreshSelection.
    let lastLandedToken = 0;

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
        restoredToken = 0;
        liveValidatingToken = 0;
    }

    // A filter-driven load becomes moot when the user selects an item, empties
    // the filter text, or closes the list before the debounce fires.
    function cancelPendingFilterLoad(): void {
        if (!latestLoadIsFilterDriven) return;
        const validating = liveValidatingToken;
        invalidateLoads();
        if (validating !== 0) {
            // The cancelled filter load had superseded an in-flight dependency
            // reload. That reload is authoritative for the deps change — items
            // and validation verdict — so restore its currency and keep the
            // loading flag up until it settles. It stays restore-eligible so
            // further type→cancel cycles before it settles hand back to it too;
            // only a settle, a disable, or unmount (invalidateLoads callers)
            // ends its authority.
            restoredToken = validating;
            liveValidatingToken = validating;
        } else if (state.loading) {
            state.loading = false;
        }
    }

    // A user selection picked from results FRESHER than a still-pending
    // validating (dependency-driven) reload retires that reload's authority:
    // its late verdict would judge the new selection against results fetched
    // for the pre-selection filter text and wipe a choice the user made from
    // post-deps-change options. A selection made from results OLDER than the
    // reload (a stale pick while it is still in flight) keeps the verdict —
    // validating exactly that pick is the reload's job.
    function retireValidationForFreshSelection(): void {
        if (liveValidatingToken === 0 || lastLandedToken < liveValidatingToken) return;
        // The retired reload may also own the restore channel (a cancel handed
        // currency back to it); spend that too so its items cannot land either
        if (restoredToken === liveValidatingToken) restoredToken = 0;
        liveValidatingToken = 0;
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
            // A new request supersedes any restored one; a newer validating
            // load also takes over the restore channel from an older one.
            restoredToken = 0;
            if (validateValue) liveValidatingToken = token;

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
                    // Captured before clearing: a reload retired by a fresh user
                    // selection (retireValidationForFreshSelection) is no longer
                    // live-validating and must not deliver its verdict below
                    const wasLiveValidating = token === liveValidatingToken;
                    if (wasLiveValidating) liveValidatingToken = 0;
                    if (token !== requestSequence && token !== restoredToken) {
                        // Superseded by a newer request: the response must not land, but a
                        // dependency reload's validation verdict still applies to the deps
                        // change — unless a newer armed load validates on its own, or a
                        // fresh user selection retired the verdict.
                        if (
                            validateValue &&
                            wasLiveValidating &&
                            armedToken === requestSequence &&
                            !armedLoadValidates
                        ) {
                            validateValueAgainstLoaded(result ?? null);
                        }
                        return;
                    }
                    // A restored load has settled; the channel is spent
                    if (token === restoredToken) restoredToken = 0;

                    if (result && result.length > 0 && typeof result[0] === 'string') {
                        state.items = convertStringItemsToObjects(result as string[]) as Item[];
                    } else {
                        state.items = result ? (result.slice() as Item[]) : null;
                    }
                    // Displayed items now reflect this filter text — a reopen with
                    // the same text won't refetch
                    loadedFilterText = currentFilterText;
                    liveLoadFilterText = undefined;
                    lastLandedToken = token;

                    if (validateValue) validateValueAgainstLoaded(state.items);

                    state.loading = false;
                    actions.onloaded((state.items as SelectItem[]) || []);
                } catch (err) {
                    // An errored load must lose restore eligibility, or a later
                    // cancel would restore a request that can never settle
                    if (token === liveValidatingToken) liveValidatingToken = 0;
                    if (token !== requestSequence && token !== restoredToken) return; // superseded; the newer request manages state
                    if (token === restoredToken) restoredToken = 0;
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

        if (!state.loadOptions) {
            // Only a genuine removal (a loader ran before) does anything here:
            // a Select that never had a loader owns its `loading` prop and must
            // not have it stomped. A removed loader resets the run history —
            // restoring it later must behave like mount (initial fetch), not
            // like "nothing changed" — and invalidates: an in-flight response
            // must not land items (and fire onloaded) on a Select that no
            // longer has a loader. With no landing left to clear it, the
            // loading flag drops here too.
            if (prevRun !== undefined) {
                prevRun = undefined;
                untrack(() => {
                    invalidateLoads();
                    if (state.loading) state.loading = false;
                });
            }
            return;
        }

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
        // No non-empty requirement on filterText: results narrowed by a typed
        // query whose text was wiped at close (Escape) are just as stale under
        // an empty input on reopen — the '' re-fetch restores the baseline set.
        // A mount load still in flight is covered by loadIsLiveForText.
        const reopenedStale =
            !isFirstRun &&
            listOpen &&
            !prev.listOpen &&
            !filterTextChanged &&
            !disabled &&
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
            // Reopened onto results that do not reflect the current filter text —
            // retained text whose load was cancelled on close
            // (clearFilterTextOnBlur=false), or an empty input over query-narrowed
            // results (Escape wiped the text): refresh immediately. A typing-open
            // is handled by the branch above (filterText changed → debounced); a
            // pure reopen whose results already match and the initial mount never
            // reach here.
            untrack(() => handleLoadOptions(filterText, { debounce: false }));
        } else if (filterTextChanged) {
            // Filter text was emptied: a load armed for the old text is moot now
            untrack(() => cancelPendingFilterLoad());
        } else if (!listOpen && prev.listOpen) {
            // The list closed without a text change — a programmatic
            // bind:listOpen=false write, which never goes through closeList()'s
            // synchronous cancel: a load armed by typing must not fire (spinner
            // + stale items) on a closed list. No-op when nothing filter-driven
            // is armed.
            untrack(() => cancelPendingFilterLoad());
        }
    });

    return {
        handleLoadOptions,
        cancelPendingFilterLoad,
        retireValidationForFreshSelection,
        invalidateLoads,
    };
}
