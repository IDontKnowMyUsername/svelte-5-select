import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { useHover } from '$lib/use-hover.svelte';
import type { SelectItem, SelectState } from '$lib/types';

// useHover registers three $effects (value-index-on-open, keep-hover-selectable,
// reset-on-filter) plus a scroll-fallback timer, so its state must be reactive
// for the effects to re-run. See use-value.svelte.test.ts for the same harness.
type Overrides = Partial<Record<keyof SelectState, unknown>>;

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
    let manager!: ReturnType<typeof useHover>;
    const cleanup = $effect.root(() => {
        manager = useHover(state);
    });
    cleanups.push(cleanup);
    flushSync();
    return { state, manager };
}

const abc: SelectItem[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
];

describe('useHover', () => {
    afterEach(() => {
        while (cleanups.length) cleanups.pop()?.();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('handleHover', () => {
        it('sets the hover index', () => {
            const { state, manager } = createHarness({ filteredItems: abc });
            manager.handleHover(2);
            expect(state.hoverItemIndex).toBe(2);
        });

        it('ignores hover while the list is scrolling', () => {
            const { state, manager } = createHarness({ filteredItems: abc, hoverItemIndex: 1, isScrolling: true });
            manager.handleHover(2);
            expect(state.hoverItemIndex).toBe(1);
        });
    });

    describe('scroll state', () => {
        it('latches isScrolling on scroll and releases it on scrollend', () => {
            const { state, manager } = createHarness();

            manager.handleListScroll();
            expect(state.isScrolling).toBe(true);

            manager.handleListScrollEnd();
            expect(state.isScrolling).toBe(false);
        });

        it('releases isScrolling via the fallback timer when scrollend never fires', () => {
            vi.useFakeTimers();
            const { state, manager } = createHarness();

            manager.handleListScroll();
            expect(state.isScrolling).toBe(true);

            // Some browsers never fire scrollend; the 150ms fallback must clear it
            vi.advanceTimersByTime(150);
            expect(state.isScrolling).toBe(false);
        });
    });

    describe('setHoverIndex (arrow navigation)', () => {
        it('skips non-selectable items when moving down', () => {
            const filteredItems: SelectItem[] = [
                { value: 'a', label: 'A', selectable: false },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C' },
            ];
            const { state, manager } = createHarness({ filteredItems, hoverItemIndex: 0 });

            manager.setHoverIndex(1);
            expect(state.hoverItemIndex).toBe(1); // skipped the non-selectable 'a'

            manager.setHoverIndex(1);
            expect(state.hoverItemIndex).toBe(2);
        });

        it('wraps around to the first selectable item', () => {
            const { state, manager } = createHarness({ filteredItems: abc, hoverItemIndex: 2 });
            manager.setHoverIndex(1);
            expect(state.hoverItemIndex).toBe(0);
        });
    });

    describe('isItemActive', () => {
        it('matches the single selected value by itemId', () => {
            const { manager } = createHarness({ normalizedValue: { value: 'b', label: 'B' } });
            expect(manager.isItemActive({ value: 'b', label: 'B' })).toBe(true);
            expect(manager.isItemActive({ value: 'a', label: 'A' })).toBe(false);
        });

        it('matches any entry of a multiple value', () => {
            const { manager } = createHarness({
                multiple: true,
                normalizedValue: [
                    { value: 'a', label: 'A' },
                    { value: 'b', label: 'B' },
                ],
            });
            expect(manager.isItemActive({ value: 'a', label: 'A' })).toBe(true);
            expect(manager.isItemActive({ value: 'c', label: 'C' })).toBe(false);
        });
    });

    describe('isItemSelectable', () => {
        it('treats a selectable group header as selectable', () => {
            const { manager } = createHarness();
            expect(manager.isItemSelectable({ value: 'G', groupHeader: true, selectable: true })).toBe(true);
            expect(manager.isItemSelectable({ value: 'x', selectable: false })).toBe(false);
            expect(manager.isItemSelectable({ value: 'x' })).toBe(true);
        });
    });

    describe('effects', () => {
        it('hovers the selected value when the list opens in single mode', () => {
            const { state } = createHarness({
                filteredItems: abc,
                value: { value: 'c', label: 'C' },
                normalizedValue: { value: 'c', label: 'C' },
                listOpen: true,
            });

            expect(state.hoverItemIndex).toBe(2);
        });

        it('moves hover off a non-selectable group header when the list opens', () => {
            const grouped: SelectItem[] = [
                { value: 'Fruit', label: 'Fruit', groupHeader: true, selectable: false },
                { value: 'a', label: 'A', groupItem: true },
                { value: 'b', label: 'B', groupItem: true },
            ];
            const { state } = createHarness({
                groupBy: () => 'Fruit',
                filteredItems: grouped,
                listOpen: true,
                hoverItemIndex: 0,
            });

            expect(state.hoverItemIndex).toBe(1);
        });

        it('resets hover to the first selectable item when filterText changes', () => {
            const grouped: SelectItem[] = [
                { value: 'Fruit', label: 'Fruit', groupHeader: true, selectable: false },
                { value: 'a', label: 'A', groupItem: true },
                { value: 'b', label: 'B', groupItem: true },
            ];
            const { state } = createHarness({
                groupBy: () => 'Fruit',
                filteredItems: grouped,
                hoverItemIndex: 2,
            });

            state.filterText = 'a';
            flushSync();

            expect(state.hoverItemIndex).toBe(1);
        });
    });
});
