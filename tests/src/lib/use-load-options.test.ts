import { describe, it, expect, vi, afterEach } from 'vitest';
import { useLoadOptions } from '$lib/use-load-options.svelte';
import type { JustValue, SelectItem, SelectProps } from '$lib/types';

function flush(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

interface MockState {
    filterText: string;
    prevFilterText: string | undefined;
    loadOptionsDeps: unknown[];
    loadOptions: ((filterText: string) => Promise<SelectItem[] | string[]>) | undefined;
    disabled: boolean;
    multiple: boolean;
    value: SelectProps['value'];
    items: SelectItem[] | string[] | null;
    itemId: string;
    useJustValue: boolean;
    justValue: JustValue | undefined;
    listOpen: boolean;
    debounceWait: number;
}

function createMockContext(overrides: Partial<MockState> = {}) {
    const state: MockState = {
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
        debounceWait: 100,
        ...overrides,
    };

    const context = {
        getState: () => state,
        setItems: vi.fn((v: SelectItem[] | string[] | null) => (state.items = v)),
        setValue: vi.fn((v: SelectProps['value']) => (state.value = v)),
        setJustValue: vi.fn((v: JustValue) => (state.justValue = v)),
        setLoading: vi.fn(),
        setListOpen: vi.fn((v: boolean) => (state.listOpen = v)),
        // Run debounced work immediately so tests stay synchronous
        debounce: vi.fn((fn: () => void, _wait: number) => fn()),
        convertStringItemsToObjects: vi.fn((items: string[]) =>
            items.map((item, index) => ({ value: item, label: item, index })),
        ),
        onloaded: vi.fn(),
        onerror: vi.fn(),
    };

    return { state, context };
}

describe('useLoadOptions', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('loads items and fires onloaded', async () => {
        const loaded = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        const { context } = createMockContext({ loadOptions: () => Promise.resolve(loaded) });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.setLoading).toHaveBeenNthCalledWith(1, true);
        expect(context.setLoading).toHaveBeenLastCalledWith(false);
        expect(context.setItems).toHaveBeenCalledWith(loaded);
        expect(context.onloaded).toHaveBeenCalledWith(loaded);
    });

    it('converts string results to item objects', async () => {
        const { context } = createMockContext({ loadOptions: () => Promise.resolve(['one', 'two']) });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.convertStringItemsToObjects).toHaveBeenCalledWith(['one', 'two']);
        expect(context.setItems).toHaveBeenCalledWith([
            { value: 'one', label: 'one', index: 0 },
            { value: 'two', label: 'two', index: 1 },
        ]);
    });

    it('sets items to null when loadOptions resolves with nothing', async () => {
        const { context } = createMockContext({
            loadOptions: () => Promise.resolve(null as unknown as SelectItem[]),
        });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.setItems).toHaveBeenCalledWith(null);
        expect(context.onloaded).toHaveBeenCalledWith([]);
    });

    it('keeps the value when it exists in the loaded items', async () => {
        const { context } = createMockContext({
            value: { value: 'a', label: 'A' },
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.setValue).not.toHaveBeenCalled();
    });

    it('clears a single value missing from the loaded items', async () => {
        const { context } = createMockContext({
            value: { value: 'gone', label: 'Gone' },
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.setValue).toHaveBeenCalledWith(undefined);
        expect(context.setJustValue).not.toHaveBeenCalled();
    });

    it('clears justValue too when useJustValue is set', async () => {
        const { context } = createMockContext({
            value: { value: 'gone', label: 'Gone' },
            useJustValue: true,
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.setValue).toHaveBeenCalledWith(undefined);
        expect(context.setJustValue).toHaveBeenCalledWith('');
    });

    it('clears a multiple value when any entry is missing from the loaded items', async () => {
        const { context } = createMockContext({
            multiple: true,
            useJustValue: true,
            value: [
                { value: 'a', label: 'A' },
                { value: 'gone', label: 'Gone' },
            ],
            loadOptions: () => Promise.resolve([{ value: 'a', label: 'A' }]),
        });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.setValue).toHaveBeenCalledWith([]);
        expect(context.setJustValue).toHaveBeenCalledWith([]);
    });

    it('clears the value when the load resolves with an empty list', async () => {
        const { context } = createMockContext({
            value: { value: 'a', label: 'A' },
            loadOptions: () => Promise.resolve([]),
        });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.setValue).toHaveBeenCalledWith(undefined);
    });

    it('reports errors and resets items when loadOptions rejects', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const failure = new Error('load failed');
        const { context } = createMockContext({ loadOptions: () => Promise.reject(failure) });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);
        await flush();

        expect(context.onerror).toHaveBeenCalledWith({ type: 'loadOptions', details: failure });
        expect(context.setItems).toHaveBeenCalledWith(null);
        expect(context.setLoading).toHaveBeenLastCalledWith(false);
        expect(context.onloaded).not.toHaveBeenCalled();
    });

    it('debounces the load when filter text changed', () => {
        const loadOptions = vi.fn(() => Promise.resolve([]));
        const { context } = createMockContext({ prevFilterText: 'a', loadOptions });
        context.debounce.mockImplementation(() => {}); // capture without executing
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('ab', []);

        expect(context.debounce).toHaveBeenCalledWith(expect.any(Function), 100);
        expect(loadOptions).not.toHaveBeenCalled();
    });

    it('loads immediately when filter text is unchanged', async () => {
        const loadOptions = vi.fn(() => Promise.resolve([]));
        const { context } = createMockContext({ filterText: 'ab', prevFilterText: 'ab', loadOptions });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('ab', []);
        await flush();

        expect(context.debounce).not.toHaveBeenCalled();
        expect(loadOptions).toHaveBeenCalledWith('ab');
    });

    it('opens the list when filter text is present and the list is closed', () => {
        const { context } = createMockContext({ loadOptions: () => Promise.resolve([]) });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('ab', []);

        expect(context.setListOpen).toHaveBeenCalledWith(true);
    });

    it('clears value, justValue, and items when disabled', () => {
        const { context } = createMockContext({
            disabled: true,
            multiple: true,
            useJustValue: true,
            value: [{ value: 'a', label: 'A' }],
            loadOptions: () => Promise.resolve([]),
        });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);

        expect(context.setValue).toHaveBeenCalledWith([]);
        expect(context.setJustValue).toHaveBeenCalledWith([]);
        expect(context.setItems).toHaveBeenCalledWith(null);
        expect(context.setLoading).not.toHaveBeenCalled();
    });

    it('clears a lingering justValue when disabled with no value', () => {
        const { context } = createMockContext({
            disabled: true,
            useJustValue: true,
            justValue: 'a',
            loadOptions: () => Promise.resolve([]),
        });
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);

        expect(context.setValue).toHaveBeenCalledWith(undefined);
        expect(context.setJustValue).toHaveBeenCalledWith('');
        expect(context.setItems).toHaveBeenCalledWith(null);
    });

    it('does nothing when no loadOptions function is provided', () => {
        const { context } = createMockContext();
        const { handleLoadOptions } = useLoadOptions(context);

        handleLoadOptions('', []);

        expect(context.setLoading).not.toHaveBeenCalled();
        expect(context.setItems).not.toHaveBeenCalled();
    });
});
