import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { useValue } from '$lib/use-value.svelte';
import type { SelectItem, SelectState, ValueActions } from '$lib/types';

// useValue owns four $effects (normalize, multiple-transition, dispatch,
// justValue-sync) that must actually re-run when state changes, so — unlike the
// static useLoadOptions harness — the state here is a real reactive $state object.
// The composable only reads config/derived fields, so exposing them as writable
// $state is harmless and lets tests drive every branch.
type Overrides = Partial<Record<keyof SelectState, unknown>>;
// The reactive proxy lets tests write config/derived fields that are readonly on
// SelectState (e.g. flipping `multiple`), so tests see a fully-mutable view.
type MutableState = { -readonly [K in keyof SelectState]: SelectState[K] };

function baseState(overrides: Overrides = {}) {
    const s = $state({
        value: undefined,
        items: null,
        filterText: '',
        justValue: undefined,
        listOpen: false,
        loading: false,
        focused: false,
        hoverItemIndex: 0,
        multiple: false,
        itemId: 'value',
        label: 'label',
        searchable: true,
        disabled: false,
        useJustValue: false,
        closeListOnChange: true,
        debounceWait: 300,
        groupBy: undefined,
        loadOptions: undefined,
        loadOptionsDeps: [],
        filteredItems: [],
        normalizedValue: null,
        hasValue: false,
        activeValue: undefined,
        isScrolling: false,
        clearState: false,
        prevValue: undefined,
        prevFilterText: undefined,
        prevMultiple: undefined,
        ...overrides,
    });
    return s;
}

const cleanups: Array<() => void> = [];

function createHarness(overrides: Overrides = {}) {
    const state = baseState(overrides) as unknown as SelectState;
    const actions: ValueActions = {
        closeList: vi.fn(),
        oninput: vi.fn(),
        onchange: vi.fn(),
        onclear: vi.fn(),
        onselect: vi.fn(),
    };

    let manager!: ReturnType<typeof useValue>;
    const cleanup = $effect.root(() => {
        manager = useValue(state, actions);
    });
    cleanups.push(cleanup);
    // Run the composable's effects once against the initial state
    flushSync();

    return { state: state as unknown as MutableState, actions, manager };
}

describe('useValue', () => {
    afterEach(() => {
        while (cleanups.length) cleanups.pop()?.();
        vi.restoreAllMocks();
    });

    describe('normalizeValue effect', () => {
        it('resolves a raw string value to the matching item', () => {
            const items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            const { state } = createHarness({ items, value: 'a', prevValue: 'a' });

            expect(state.value).toEqual({ value: 'a', label: 'Apple' });
        });

        it('upgrades a synthesized fallback to the real item when async items arrive', () => {
            const { state } = createHarness({ items: null, value: 'a', prevValue: 'a' });

            // No items yet: value becomes a synthesized {value,label} fallback
            expect(state.value).toEqual({ value: 'a', label: 'a' });

            state.items = [{ value: 'a', label: 'Apple', calories: 50 }] as SelectItem[];
            flushSync();

            expect(state.value).toEqual({ value: 'a', label: 'Apple', calories: 50 });
        });

        it('resolves every entry of a raw string array in multiple mode', () => {
            const items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            const { state } = createHarness({
                multiple: true,
                items,
                value: ['a', 'b'],
                prevValue: ['a', 'b'],
                prevMultiple: true,
            });

            expect(state.value).toEqual([
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ]);
        });
    });

    describe('dispatchSelectedItem effect', () => {
        it('fires oninput when a value is set from empty', () => {
            const { state, actions } = createHarness();
            expect(actions.oninput).not.toHaveBeenCalled();

            state.value = { value: 'a', label: 'Apple' };
            flushSync();

            expect(actions.oninput).toHaveBeenCalledWith({ value: 'a', label: 'Apple' });
        });

        it('reports a cleared single value as null, not an empty array', () => {
            const { state, actions } = createHarness({
                value: { value: 'a', label: 'Apple' },
                prevValue: { value: 'a', label: 'Apple' },
            });

            state.value = undefined;
            flushSync();

            expect(actions.oninput).toHaveBeenCalledWith(null);
        });

        it('reports a cleared multiple value as an empty array', () => {
            const { state, actions } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });

            state.value = undefined;
            flushSync();

            expect(actions.oninput).toHaveBeenCalledWith([]);
        });

        it('does not re-dispatch when the value is unchanged', () => {
            const item = { value: 'a', label: 'Apple' };
            const { state, actions } = createHarness({ value: item, prevValue: item });
            (actions.oninput as ReturnType<typeof vi.fn>).mockClear();

            // Writing an equal-by-itemId item must not fire oninput again
            state.value = { value: 'a', label: 'Apple' };
            flushSync();

            expect(actions.oninput).not.toHaveBeenCalled();
        });
    });

    describe('multiple-transition effect', () => {
        it('deduplicates a multiple value that gained a duplicate entry', () => {
            const { state } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });

            state.value = [
                { value: 'a', label: 'Apple' },
                { value: 'a', label: 'Apple' },
            ];
            flushSync();

            expect(state.value).toEqual([{ value: 'a', label: 'Apple' }]);
        });

        it('nulls a leftover array value when multiple flips true to false', () => {
            const { state } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });

            state.multiple = false;
            flushSync();

            expect(state.value).toBeNull();
        });

        it('wraps a single value in an array when multiple flips false to true', () => {
            const { state } = createHarness({
                value: { value: 'a', label: 'Apple' },
                prevValue: { value: 'a', label: 'Apple' },
            });

            state.multiple = true;
            flushSync();

            expect(state.value).toEqual([{ value: 'a', label: 'Apple' }]);
        });
    });

    describe('justValue sync effect', () => {
        it('hydrates value from an initial justValue once items are present', () => {
            const items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            const { state } = createHarness({ useJustValue: true, justValue: 'b', items });

            expect(state.value).toEqual({ value: 'b', label: 'Banana' });
        });

        it('hydrates a multiple justValue all-or-nothing', () => {
            const { state } = createHarness({
                multiple: true,
                prevMultiple: true,
                useJustValue: true,
                justValue: ['a', 'b'],
                items: null,
            });

            // Items missing: no partial hydration, value stays unhydrated
            expect(state.value).toBeUndefined();

            state.items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ] as SelectItem[];
            flushSync();

            expect(state.value).toEqual([
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ]);
        });

        it('does not resurrect the selection when a parent clears bind:value externally', () => {
            const items = [{ value: 'a', label: 'Apple' }];
            const { state, actions } = createHarness({ useJustValue: true, justValue: 'a', items });

            // Hydrated to the Apple item, and justValue echoed back
            expect(state.value).toEqual({ value: 'a', label: 'Apple' });
            (actions.oninput as ReturnType<typeof vi.fn>).mockClear();

            // Parent clears value directly (justValue still holds our echoed 'a')
            state.value = undefined;
            flushSync();

            // Must behave like a clear, not re-hydrate from the stale justValue echo
            expect(state.value).toBeUndefined();
            expect(actions.oninput).toHaveBeenCalledWith(null);
        });
    });

    describe('itemSelected', () => {
        it('appends to a multiple value and fires onchange + onselect, clearing filterText', () => {
            const { state, actions, manager } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
                filterText: 'ban',
            });

            manager.itemSelected({ value: 'b', label: 'Banana' });
            flushSync();

            expect(state.value).toEqual([
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ]);
            expect(state.filterText).toBe('');
            expect(actions.onchange).toHaveBeenCalled();
            expect(actions.onselect).toHaveBeenCalledWith({ value: 'b', label: 'Banana' });
        });

        it('ignores a non-selectable group header', () => {
            const { state, manager } = createHarness();

            manager.itemSelected({ value: 'Fruit', label: 'Fruit', groupHeader: true, selectable: false });
            flushSync();

            expect(state.value).toBeUndefined();
        });
    });

    describe('handleMultiItemClear', () => {
        it('removes one entry and fires onclear with the removed item', async () => {
            const { state, actions, manager } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [
                    { value: 'a', label: 'Apple' },
                    { value: 'b', label: 'Banana' },
                ],
                prevValue: [
                    { value: 'a', label: 'Apple' },
                    { value: 'b', label: 'Banana' },
                ],
            });

            await manager.handleMultiItemClear(0);
            flushSync();

            expect(state.value).toEqual([{ value: 'b', label: 'Banana' }]);
            expect(actions.onclear).toHaveBeenCalledTimes(1);
            expect((actions.onclear as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ value: 'a' });
        });

        it('clears the whole value when the last entry is removed', async () => {
            const { state, manager } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });

            await manager.handleMultiItemClear(0);
            flushSync();

            expect(state.value).toBeUndefined();
        });
    });
});
