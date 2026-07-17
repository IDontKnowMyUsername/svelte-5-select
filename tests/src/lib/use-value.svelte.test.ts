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

        // 7th-audit pin: the fallback hardcoded a literal 'label' key, but the
        // selection display reads normalizedValue[label] — with a custom label
        // prop the rendered selection was blank until items resolved.
        it('keys the synthesized fallback with the configured itemId and label', () => {
            const { state } = createHarness({
                itemId: 'id',
                label: 'name',
                items: null,
                value: 'abc',
                prevValue: 'abc',
            });

            expect(state.value).toEqual({ id: 'abc', name: 'abc' });
        });

        it('upgrades a custom-keyed fallback to the real item when items arrive', () => {
            const { state } = createHarness({
                itemId: 'id',
                label: 'name',
                items: null,
                value: 'abc',
                prevValue: 'abc',
            });

            state.items = [{ id: 'abc', name: 'Alphabet', extra: 1 }] as SelectItem[];
            flushSync();

            expect(state.value).toEqual({ id: 'abc', name: 'Alphabet', extra: 1 });
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

        // 9th-audit pin: undefined/null and [] are the same no-selection state
        // in multiple mode — moving between them dispatched a spurious oninput([]).
        it('does not dispatch when an empty multiple value changes representation', () => {
            const { state, actions } = createHarness({ multiple: true, prevMultiple: true, value: [], prevValue: [] });
            (actions.oninput as ReturnType<typeof vi.fn>).mockClear();

            state.value = undefined; // [] -> undefined
            flushSync();
            expect(actions.oninput).not.toHaveBeenCalled();

            state.value = []; // undefined -> []
            flushSync();
            expect(actions.oninput).not.toHaveBeenCalled();
        });

        it('still reports a real clear from tags to an empty array', () => {
            const { state, actions } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });

            state.value = [];
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

        // 7th-audit pin: the dispatch/justValue effects tracked only the value
        // reference, and prevValue aliased the live array, so a consumer's
        // in-place `value.push(...)` never dispatched and left justValue stale.
        it('dispatches oninput when a bound multi value grows in place (value.push)', () => {
            const items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            const { state, actions } = createHarness({
                multiple: true,
                prevMultiple: true,
                items,
                value: [items[0]],
                prevValue: [items[0]],
            });
            (actions.oninput as ReturnType<typeof vi.fn>).mockClear();

            (state.value as SelectItem[]).push(items[1]);
            flushSync();

            expect(actions.oninput).toHaveBeenCalledTimes(1);
            expect(actions.oninput).toHaveBeenCalledWith([
                expect.objectContaining({ value: 'a' }),
                expect.objectContaining({ value: 'b' }),
            ]);
        });

        it('keeps justValue in sync when a bound multi value grows in place', () => {
            const items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            const { state } = createHarness({
                multiple: true,
                prevMultiple: true,
                items,
                value: [items[0]],
                prevValue: [items[0]],
            });

            (state.value as SelectItem[]).push(items[1]);
            flushSync();

            expect(state.justValue).toEqual(['a', 'b']);
        });

        it('dedupes an in-place duplicate push without dispatching oninput', () => {
            const items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            const { state, actions } = createHarness({
                multiple: true,
                prevMultiple: true,
                items,
                value: [items[0]],
                prevValue: [items[0]],
            });
            (actions.oninput as ReturnType<typeof vi.fn>).mockClear();

            // Re-adding an already-selected entry is a no-op set operation
            (state.value as SelectItem[]).push({ value: 'a', label: 'Apple' });
            flushSync();

            expect(actions.oninput).not.toHaveBeenCalled();
            expect(state.value).toEqual([expect.objectContaining({ value: 'a' })]);
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

        // `undefined`, not `null`: an emptied value has one representation across
        // every clear path, so consumers never have to test for both
        it('empties a leftover array value when multiple flips true to false', () => {
            const { state } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });

            state.multiple = false;
            flushSync();

            expect(state.value).toBeUndefined();
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

        // 9th-audit pin: the multiple->single wipe keyed on truthiness, so a
        // replacement single value supplied together with the flip was wiped too.
        it('keeps a replacement single value supplied with a multiple->single flip', () => {
            const { state, actions } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });

            state.multiple = false;
            state.value = { value: 'b', label: 'Banana' };
            flushSync();

            expect(state.value).toEqual({ value: 'b', label: 'Banana' });
            expect(actions.oninput).toHaveBeenCalledWith({ value: 'b', label: 'Banana' });
        });

        // 9th-audit pin: mount with `multiple` and a bare (non-array) item
        // dispatched a spurious oninput([item]) — the wrap registered as an
        // array-shape change against the bare-seeded prevValue.
        it('mounting multiple with a bare item wraps it without dispatching oninput', () => {
            const item = { value: 'a', label: 'Apple' };
            // prevMultiple stays undefined: the mount transition runs setupMulti
            const { state, actions } = createHarness({ multiple: true, value: item, prevValue: item });

            expect(state.value).toEqual([item]);
            expect(actions.oninput).not.toHaveBeenCalled();
        });

        // 9th-audit pin: a bare value written while multiple stayed on was never
        // wrapped (setupMulti only runs on a mode transition), leaving a
        // non-array value that rendered no chip and derived a scalar justValue.
        it('wraps a bare value written while multiple stays on and dispatches it', () => {
            const { state, actions } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });
            (actions.oninput as ReturnType<typeof vi.fn>).mockClear();

            state.value = { value: 'b', label: 'Banana' };
            flushSync();

            expect(state.value).toEqual([{ value: 'b', label: 'Banana' }]);
            expect(actions.oninput).toHaveBeenCalledWith([{ value: 'b', label: 'Banana' }]);
        });
    });

    describe('justValue sync effect', () => {
        // 9th-audit pin: deriving justValue from a not-yet-hydrated `[]` value
        // clobbered a seeded justValue with [] — permanently when items arrived
        // late, because hydration needs the justValue that was just overwritten.
        it('preserves a seeded justValue over an empty multiple value until hydration', () => {
            const { state } = createHarness({
                multiple: true,
                prevMultiple: true,
                useJustValue: true,
                value: [],
                prevValue: [],
                justValue: ['a'],
                items: null,
            });

            // No items yet: the seeded justValue must survive untouched
            expect(state.justValue).toEqual(['a']);

            state.items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            flushSync();

            // Late items hydrate the selection from the preserved justValue
            expect(state.value).toEqual([{ value: 'a', label: 'Apple' }]);
            expect(state.justValue).toEqual(['a']);
        });

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

        // 7th-audit change: a post-mount justValue write used to sit dormant
        // (the effect did not track justValue) and then hydrate `value` on the
        // next unrelated trigger. It now applies deterministically right away.
        it('hydrates immediately when justValue is written after mount and no value exists', () => {
            const items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            const { state } = createHarness({ useJustValue: true, items });
            expect(state.value).toBeUndefined();

            state.justValue = 'b';
            flushSync();

            expect(state.value).toEqual({ value: 'b', label: 'Banana' });
        });

        it('corrects a justValue write that conflicts with the current selection (value wins)', () => {
            const items = [
                { value: 'a', label: 'Apple' },
                { value: 'b', label: 'Banana' },
            ];
            const { state } = createHarness({
                useJustValue: true,
                items,
                value: { value: 'a', label: 'Apple' },
                prevValue: { value: 'a', label: 'Apple' },
            });

            state.justValue = 'b';
            flushSync();

            expect(state.value).toEqual({ value: 'a', label: 'Apple' });
            expect(state.justValue).toBe('a');
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

        it('flushes clearState even when no value change accompanies it', () => {
            const { state } = createHarness();

            // A clear flag set without a co-occurring value/items/multiple/itemId
            // change must still be consumed and reset — otherwise it sticks true
            // and blocks the next hydration.
            state.clearState = true;
            flushSync();

            expect(state.clearState).toBe(false);
        });

        it('does not let a stuck clearState block a later hydration', () => {
            const { state } = createHarness({ useJustValue: true, items: [{ value: 'a', label: 'Apple' }] });

            // Simulate a clear flag left set on its own (no value change to carry it
            // into the sync effect). With the flag tracked it is flushed here...
            state.clearState = true;
            flushSync();
            expect(state.clearState).toBe(false);

            // ...so a subsequent justValue + items arrival hydrates normally rather
            // than being silently skipped by a still-true clearState.
            state.justValue = 'a';
            state.items = [{ value: 'a', label: 'Apple' }];
            flushSync();

            expect(state.value).toEqual({ value: 'a', label: 'Apple' });
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

        it('is a no-op when re-selecting an already-selected item (no duplicate, no callbacks)', () => {
            const { state, actions, manager } = createHarness({
                multiple: true,
                prevMultiple: true,
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });
            (actions.onchange as ReturnType<typeof vi.fn>).mockClear();

            manager.itemSelected({ value: 'a', label: 'Apple' });
            flushSync();

            expect(state.value).toEqual([{ value: 'a', label: 'Apple' }]);
            expect(actions.onchange).not.toHaveBeenCalled();
            expect(actions.onselect).not.toHaveBeenCalled();
        });

        // 7th-audit pin: the filterText wipe ran before the no-op guard, so with
        // filterSelectedItems={false} a re-click that selected nothing still
        // cleared what the user had typed
        it('keeps the typed filter text on a no-op re-selection', () => {
            const { state, actions, manager } = createHarness({
                multiple: true,
                prevMultiple: true,
                closeListOnChange: false,
                filterText: 'app',
                value: [{ value: 'a', label: 'Apple' }],
                prevValue: [{ value: 'a', label: 'Apple' }],
            });

            manager.itemSelected({ value: 'a', label: 'Apple' });
            flushSync();

            expect(state.filterText).toBe('app');
            expect(actions.closeList).not.toHaveBeenCalled();
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
