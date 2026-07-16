import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { useLoadOptions } from '$lib/use-load-options.svelte';
import type { SelectItem, SelectState } from '$lib/types';

function flush(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

type Writable<T> = { -readonly [K in keyof T]: T[K] };
type MockState = Writable<
    Pick<
        SelectState,
        | 'filterText'
        | 'prevFilterText'
        | 'loadOptionsDeps'
        | 'loadOptions'
        | 'disabled'
        | 'multiple'
        | 'value'
        | 'items'
        | 'itemId'
        | 'useJustValue'
        | 'justValue'
        | 'listOpen'
        | 'loading'
        | 'debounceWait'
    >
>;

const cleanups: Array<() => void> = [];

// The composable registers its own load effect, so it must be created inside an
// effect root. The mock state is a plain (non-reactive) object: the effect runs
// once on flushSync with loadOptions still unset and never re-runs, so tests
// drive handleLoadOptions manually. A Proxy records writes so tests can
// distinguish "wrote the same value" from "did not write".
function createHarness(overrides: Partial<MockState> = {}) {
    const { loadOptions, ...rest } = overrides;

    const writes: Partial<Record<keyof MockState, unknown[]>> = {};
    const target: MockState = {
        filterText: '',
        prevFilterText: '',
        loadOptionsDeps: [],
        loadOptions: undefined,
        disabled: false,
        multiple: false,
        value: null,
        items: null,
        itemId: 'value',
        useJustValue: false,
        justValue: undefined,
        listOpen: false,
        loading: false,
        debounceWait: 100,
        ...rest,
    };

    const state = new Proxy(target, {
        set(obj, prop, v) {
            (writes[prop as keyof MockState] ??= []).push(v);
            return Reflect.set(obj, prop, v);
        },
    }) as SelectState;

    const actions = {
        // Run debounced work immediately so tests stay synchronous
        debounce: vi.fn((fn: () => void, _wait: number) => fn()),
        onloaded: vi.fn(),
        onerror: vi.fn(),
    };

    let manager!: ReturnType<typeof useLoadOptions>;
    const cleanup = $effect.root(() => {
        manager = useLoadOptions(state, actions);
    });
    cleanups.push(cleanup);
    // Run the composable's effect now, before loadOptions exists, so it no-ops
    flushSync();

    if (loadOptions) {
        target.loadOptions = loadOptions;
    }

    return {
        state,
        writes,
        actions,
        handleLoadOptions: manager.handleLoadOptions,
        cancelPendingFilterLoad: manager.cancelPendingFilterLoad,
        invalidateLoads: manager.invalidateLoads,
    };
}

describe('useLoadOptions', () => {
    afterEach(() => {
        while (cleanups.length) cleanups.pop()?.();
        vi.restoreAllMocks();
    });

    it('loads items and fires onloaded', async () => {
        const loaded = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        const { writes, actions, handleLoadOptions } = createHarness({ loadOptions: () => Promise.resolve(loaded) });

        handleLoadOptions('');
        await flush();

        expect(writes.loading).toEqual([true, false]);
        expect(writes.items).toEqual([loaded]);
        expect(actions.onloaded).toHaveBeenCalledWith(loaded);
    });

    it('converts string results to item objects', async () => {
        const { writes, handleLoadOptions } = createHarness({ loadOptions: () => Promise.resolve(['one', 'two']) });

        handleLoadOptions('');
        await flush();

        expect(writes.items).toEqual([
            [
                { value: 'one', label: 'one', index: 0 },
                { value: 'two', label: 'two', index: 1 },
            ],
        ]);
    });

    it('sets items to null when loadOptions resolves with nothing', async () => {
        const { writes, actions, handleLoadOptions } = createHarness({
            loadOptions: () => Promise.resolve(null as unknown as SelectItem[]),
        });

        handleLoadOptions('');
        await flush();

        expect(writes.items).toEqual([null]);
        expect(actions.onloaded).toHaveBeenCalledWith([]);
    });

    it('keeps the value when it exists in the loaded items', async () => {
        const { writes, handleLoadOptions } = createHarness({
            value: { value: 'a', label: 'A' },
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });

        handleLoadOptions('', { validateValue: true });
        await flush();

        expect(writes.value).toBeUndefined();
    });

    it('clears a single value missing from a dependency-driven load', async () => {
        const { writes, handleLoadOptions } = createHarness({
            value: { value: 'gone', label: 'Gone' },
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });

        handleLoadOptions('', { validateValue: true });
        await flush();

        expect(writes.value).toEqual([undefined]);
        expect(writes.justValue).toBeUndefined();
    });

    it('clears justValue too when useJustValue is set', async () => {
        const { writes, handleLoadOptions } = createHarness({
            value: { value: 'gone', label: 'Gone' },
            useJustValue: true,
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });

        handleLoadOptions('', { validateValue: true });
        await flush();

        expect(writes.value).toEqual([undefined]);
        expect(writes.justValue).toEqual([undefined]);
    });

    // 7th-audit change: validation drops only what a reload proves stale.
    // Entries the reload still offers survive; previously one missing entry
    // wiped the entire multiple selection.
    it('drops only the stale entries of a multiple value on a dependency-driven load', async () => {
        const { writes, handleLoadOptions } = createHarness({
            multiple: true,
            useJustValue: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'gone', label: 'Gone' },
            ],
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });

        handleLoadOptions('', { validateValue: true });
        await flush();

        // justValue is not written here: it re-derives from the value write
        expect(writes.value).toEqual([[{ value: 'a', label: 'A' }]]);
        expect(writes.justValue).toBeUndefined();
    });

    // Multiple mode empties to `undefined` like every other clear path, not to `[]`:
    // the clear button already wrote `undefined` in multiple mode, so `[]` was only
    // ever a second empty representation consumers had to also handle
    it('clears a multiple value when no entry survives a dependency-driven load', async () => {
        const { writes, handleLoadOptions } = createHarness({
            multiple: true,
            useJustValue: true,
            value: [
                { value: 'gone', label: 'Gone' },
                { value: 'also-gone', label: 'Also gone' },
            ],
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });

        handleLoadOptions('', { validateValue: true });
        await flush();

        expect(writes.value).toEqual([undefined]);
        expect(writes.justValue).toEqual([undefined]);
    });

    // 7th-audit change: an empty reload result is no evidence the value is
    // invalid — the reload queries with the retained (usually empty) filter
    // text, and a search endpoint returns [] for an empty query regardless of
    // the selection. Previously every deps change against such an endpoint
    // wiped a valid selection.
    it('keeps the value when a dependency-driven load resolves with an empty list', async () => {
        const { writes, handleLoadOptions } = createHarness({
            value: { value: 'a', label: 'A' },
            loadOptions: () => Promise.resolve([]),
        });

        handleLoadOptions('', { validateValue: true });
        await flush();

        expect(writes.value).toBeUndefined();
    });

    it('keeps a value missing from a filter-driven load (no validateValue)', async () => {
        const { writes, handleLoadOptions } = createHarness({
            multiple: true,
            value: [{ value: 'apple', label: 'Apple' }],
            loadOptions: () => Promise.resolve([{ value: 'banana', label: 'Banana' }]),
        });

        handleLoadOptions('ban');
        await flush();

        expect(writes.value).toBeUndefined();
        expect(writes.justValue).toBeUndefined();
    });

    it('reports errors and resets items when loadOptions rejects', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const failure = new Error('load failed');
        const { writes, actions, handleLoadOptions } = createHarness({ loadOptions: () => Promise.reject(failure) });

        handleLoadOptions('');
        await flush();

        expect(actions.onerror).toHaveBeenCalledWith({ type: 'loadOptions', details: failure });
        expect(writes.items).toEqual([null]);
        expect(writes.loading).toEqual([true, false]);
        expect(actions.onloaded).not.toHaveBeenCalled();
    });

    it('debounces the load when filter text changed', () => {
        const loadOptions = vi.fn(() => Promise.resolve([]));
        const { actions, handleLoadOptions } = createHarness({ prevFilterText: 'a', loadOptions });
        actions.debounce.mockImplementation(() => {}); // capture without executing

        handleLoadOptions('ab');

        expect(actions.debounce).toHaveBeenCalledWith(expect.any(Function), 100);
        expect(loadOptions).not.toHaveBeenCalled();
    });

    it('loads immediately when filter text is unchanged', async () => {
        const loadOptions = vi.fn(() => Promise.resolve([]));
        const { actions, handleLoadOptions } = createHarness({ filterText: 'ab', prevFilterText: 'ab', loadOptions });

        handleLoadOptions('ab');
        await flush();

        expect(actions.debounce).not.toHaveBeenCalled();
        expect(loadOptions).toHaveBeenCalledWith('ab');
    });

    it('never touches listOpen (opening the list is the component"s job)', async () => {
        const { writes, handleLoadOptions } = createHarness({ loadOptions: () => Promise.resolve([]) });

        handleLoadOptions('ab');
        await flush();

        expect(writes.listOpen).toBeUndefined();
    });

    it('discards a stale response that resolves after a newer request', async () => {
        let resolveFirst!: (items: SelectItem[]) => void;
        let resolveSecond!: (items: SelectItem[]) => void;
        const loadOptions = vi
            .fn()
            .mockImplementationOnce(() => new Promise<SelectItem[]>((r) => (resolveFirst = r)))
            .mockImplementationOnce(() => new Promise<SelectItem[]>((r) => (resolveSecond = r)));
        const { state, writes, actions, handleLoadOptions } = createHarness({ loadOptions });

        // Same filter text on both calls, so both execute immediately (no debounce)
        handleLoadOptions('');
        handleLoadOptions('');

        resolveSecond([{ value: 'new', label: 'New' }]);
        await flush();
        resolveFirst([{ value: 'old', label: 'Old' }]);
        await flush();

        expect(state.items).toEqual([{ value: 'new', label: 'New' }]);
        expect(writes.items).toEqual([[{ value: 'new', label: 'New' }]]);
        expect(actions.onloaded).toHaveBeenCalledTimes(1);
    });

    it('clears value, justValue, and items when disabled', () => {
        const { writes, handleLoadOptions } = createHarness({
            disabled: true,
            multiple: true,
            useJustValue: true,
            value: [{ value: 'a', label: 'A' }],
            loadOptions: () => Promise.resolve([]),
        });

        handleLoadOptions('');

        expect(writes.value).toEqual([undefined]);
        expect(writes.justValue).toEqual([undefined]);
        expect(writes.items).toEqual([null]);
        expect(writes.loading).toBeUndefined();
    });

    it('clears a lingering justValue when disabled with no value', () => {
        const { writes, handleLoadOptions } = createHarness({
            disabled: true,
            useJustValue: true,
            justValue: 'a',
            loadOptions: () => Promise.resolve([]),
        });

        handleLoadOptions('');

        expect(writes.value).toEqual([undefined]);
        expect(writes.justValue).toEqual([undefined]);
        expect(writes.items).toEqual([null]);
    });

    it('does nothing when no loadOptions function is provided', () => {
        const { writes, handleLoadOptions } = createHarness();

        handleLoadOptions('');

        expect(writes.loading).toBeUndefined();
        expect(writes.items).toBeUndefined();
    });

    it('a cancelled filter-driven load never fetches and resets loading', async () => {
        const loadOptions = vi.fn(() => Promise.resolve([]));
        const { writes, actions, handleLoadOptions, cancelPendingFilterLoad } = createHarness({ loadOptions });
        let armed: (() => void) | undefined;
        actions.debounce.mockImplementation((fn: () => void) => {
            armed = fn;
        });

        handleLoadOptions('ab', { debounce: true });
        expect(writes.loading).toEqual([true]);

        cancelPendingFilterLoad();
        armed!(); // the debounce timer fires anyway — e.g. a custom debounce prop
        await flush();

        expect(loadOptions).not.toHaveBeenCalled();
        expect(writes.loading).toEqual([true, false]);
        expect(actions.onloaded).not.toHaveBeenCalled();
    });

    it('cancelPendingFilterLoad leaves a dependency-driven load alone', async () => {
        let resolveLoad!: (items: SelectItem[]) => void;
        const loadOptions = vi.fn(() => new Promise<SelectItem[]>((r) => (resolveLoad = r)));
        const { writes, actions, handleLoadOptions, cancelPendingFilterLoad } = createHarness({ loadOptions });

        handleLoadOptions('', { debounce: false, validateValue: true });
        cancelPendingFilterLoad();

        resolveLoad([{ value: 'a', label: 'A' }]);
        await flush();

        expect(writes.items).toEqual([[{ value: 'a', label: 'A' }]]);
        expect(actions.onloaded).toHaveBeenCalledTimes(1);
    });

    it('invalidateLoads discards an in-flight response', async () => {
        let resolveLoad!: (items: SelectItem[]) => void;
        const loadOptions = vi.fn(() => new Promise<SelectItem[]>((r) => (resolveLoad = r)));
        const { writes, actions, handleLoadOptions, invalidateLoads } = createHarness({ loadOptions });

        handleLoadOptions('', { debounce: false });
        invalidateLoads();

        resolveLoad([{ value: 'a', label: 'A' }]);
        await flush();

        expect(writes.items).toBeUndefined();
        expect(actions.onloaded).not.toHaveBeenCalled();
    });

    it('a disabled call invalidates the load already in flight', async () => {
        let resolveLoad!: (items: SelectItem[]) => void;
        const loadOptions = vi.fn(() => new Promise<SelectItem[]>((r) => (resolveLoad = r)));
        const { state, writes, actions, handleLoadOptions } = createHarness({ loadOptions });

        handleLoadOptions('', { debounce: false });
        (state as MockState).disabled = true;
        handleLoadOptions('');

        resolveLoad([{ value: 'a', label: 'A' }]);
        await flush();

        // Only the disabled wipe touched items; the stale response was discarded
        expect(writes.items).toEqual([null]);
        expect(writes.loading).toEqual([true, false]);
        expect(actions.onloaded).not.toHaveBeenCalled();
    });

    it('a dependency reload superseded by typing still validates the value', async () => {
        let resolveDeps!: (items: SelectItem[]) => void;
        let resolveTyping!: (items: SelectItem[]) => void;
        const loadOptions = vi
            .fn()
            .mockImplementationOnce(() => new Promise<SelectItem[]>((r) => (resolveDeps = r)))
            .mockImplementationOnce(() => new Promise<SelectItem[]>((r) => (resolveTyping = r)));
        const { writes, handleLoadOptions } = createHarness({
            value: { value: 'paris', label: 'Paris' },
            loadOptions,
        });

        handleLoadOptions('', { validateValue: true, debounce: false }); // deps changed
        handleLoadOptions('mu', { debounce: true }); // typing supersedes before the response lands

        resolveDeps([{ value: 'berlin', label: 'Berlin' }]); // stale response missing Paris
        await flush();

        // The stale items never land, but the deps change's verdict still clears the value
        expect(writes.items).toBeUndefined();
        expect(writes.value).toEqual([undefined]);

        resolveTyping([{ value: 'munich', label: 'Munich' }]);
        await flush();

        expect(writes.items).toEqual([[{ value: 'munich', label: 'Munich' }]]);
    });

    it('a newer dependency reload owns the validation verdict', async () => {
        let resolveFirst!: (items: SelectItem[]) => void;
        let resolveSecond!: (items: SelectItem[]) => void;
        const loadOptions = vi
            .fn()
            .mockImplementationOnce(() => new Promise<SelectItem[]>((r) => (resolveFirst = r)))
            .mockImplementationOnce(() => new Promise<SelectItem[]>((r) => (resolveSecond = r)));
        const { writes, handleLoadOptions } = createHarness({
            value: { value: 'paris', label: 'Paris' },
            loadOptions,
        });

        handleLoadOptions('', { validateValue: true, debounce: false });
        handleLoadOptions('', { validateValue: true, debounce: false }); // deps changed again

        resolveFirst([{ value: 'berlin', label: 'Berlin' }]); // superseded verdict must stay silent
        await flush();
        expect(writes.value).toBeUndefined();

        resolveSecond([{ value: 'paris', label: 'Paris' }]); // the newest reload validates: value exists
        await flush();
        expect(writes.value).toBeUndefined();
    });

    // `items` is only written when a response lands, so while a dependency reload
    // is in flight the list still shows the pre-reload options. Anything the user
    // picks during that window therefore comes from the very set the deps change
    // invalidates — the verdict must still clear it, or `value` ends up absent
    // from `items` (and the hidden input would serialize a value the list denies).
    it('invalidates a selection made from the stale list while a dependency reload is in flight', async () => {
        let resolveDeps!: (items: SelectItem[]) => void;
        const loadOptions = vi.fn(() => new Promise<SelectItem[]>((r) => (resolveDeps = r)));
        const { state, handleLoadOptions } = createHarness({
            value: { value: 'paris', label: 'Paris' },
            items: [
                { value: 'paris', label: 'Paris' },
                { value: 'lyon', label: 'Lyon' },
            ],
            loadOptions,
        });

        handleLoadOptions('', { validateValue: true, debounce: false }); // deps changed, validates Paris

        // Still the pre-reload (French) list on screen, so Lyon is a stale pick
        (state as MockState).value = { value: 'lyon', label: 'Lyon' };

        resolveDeps([{ value: 'berlin', label: 'Berlin' }]);
        await flush();

        expect(state.value).toBeUndefined();
        expect(state.items).toEqual([{ value: 'berlin', label: 'Berlin' }]);
    });

    it('invalidates every stale entry when a tag is added during a dependency reload', async () => {
        let resolveDeps!: (items: SelectItem[]) => void;
        const loadOptions = vi.fn(() => new Promise<SelectItem[]>((r) => (resolveDeps = r)));
        const { state, handleLoadOptions } = createHarness({
            multiple: true,
            value: [{ value: 'paris', label: 'Paris' }],
            items: [
                { value: 'paris', label: 'Paris' },
                { value: 'lyon', label: 'Lyon' },
            ],
            loadOptions,
        });

        handleLoadOptions('', { validateValue: true, debounce: false });

        // Adding one stale tag must not shield the rest of the selection from the
        // verdict: a length change alone is not evidence the deps verdict is moot
        (state as MockState).value = [
            { value: 'paris', label: 'Paris' },
            { value: 'lyon', label: 'Lyon' },
        ];

        resolveDeps([{ value: 'berlin', label: 'Berlin' }]);
        await flush();

        expect(state.value).toBeUndefined();
    });

    it('keeps a mid-flight selection that the dependency reload does return', async () => {
        let resolveDeps!: (items: SelectItem[]) => void;
        const loadOptions = vi.fn(() => new Promise<SelectItem[]>((r) => (resolveDeps = r)));
        const { state, writes, handleLoadOptions } = createHarness({
            value: { value: 'paris', label: 'Paris' },
            loadOptions,
        });

        handleLoadOptions('', { validateValue: true, debounce: false });

        // A programmatic set to an item the new deps DO offer (e.g. the parent
        // changes country and city together) survives on its own merits — it
        // passes the membership check, so no special-casing is needed
        (state as MockState).value = { value: 'berlin', label: 'Berlin' };

        resolveDeps([{ value: 'berlin', label: 'Berlin' }]);
        await flush();

        expect(state.value).toEqual({ value: 'berlin', label: 'Berlin' });
        expect(writes.value).toEqual([{ value: 'berlin', label: 'Berlin' }]);
    });

    it('an invalidated dependency reload delivers no verdict', async () => {
        let resolveLoad!: (items: SelectItem[]) => void;
        const loadOptions = vi.fn(() => new Promise<SelectItem[]>((r) => (resolveLoad = r)));
        const { writes, handleLoadOptions, invalidateLoads } = createHarness({
            value: { value: 'paris', label: 'Paris' },
            loadOptions,
        });

        handleLoadOptions('', { validateValue: true, debounce: false });
        invalidateLoads(); // disable/unmount — nothing may write state

        resolveLoad([{ value: 'berlin', label: 'Berlin' }]);
        await flush();

        expect(writes.value).toBeUndefined();
        expect(writes.items).toBeUndefined();
    });

    it('keeps value and items when disabled without a disabled transition (mount)', () => {
        const { writes, handleLoadOptions } = createHarness({
            disabled: true,
            value: { value: 'a', label: 'A' },
            loadOptions: () => Promise.resolve([]),
        });

        handleLoadOptions('', { clearValueOnDisabled: false });

        expect(writes.value).toBeUndefined();
        expect(writes.justValue).toBeUndefined();
        expect(writes.items).toBeUndefined();
        expect(writes.loading).toBeUndefined();
    });
});
