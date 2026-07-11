<svelte:options runes={true} />

<script lang="ts" generics="Item extends SelectItem = SelectItem">
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import { offset, flip, shift } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';
    import type { FloatingConfig, SelectProps, SelectValue, ErrorEvent as SelectErrorEvent } from './types';
    import { useAriaHandlers } from '$lib/aria-handlers.svelte';

    import _filter from './filter';

    import ChevronIcon from './ChevronIcon.svelte';
    import ClearIcon from './ClearIcon.svelte';
    import LoadingIcon from './LoadingIcon.svelte';
    import type { SelectItem } from '$lib/types';
    import type { HTMLInputAttributes } from 'svelte/elements';
    import { createSelectState } from '$lib/select-state.svelte';
    import { useKeyboardNavigation } from '$lib/keyboard-navigation.svelte';
    import { useHover } from '$lib/use-hover.svelte';
    import { useValue } from '$lib/use-value.svelte';
    import { useLoadOptions } from '$lib/use-load-options.svelte';
    import {
        areItemsEqual,
        convertStringItemsToObjects,
        isItemSelectableCheck,
        normalizeItem,
        createGroupHeaderItem as _createGroupHeaderItem,
    } from '$lib/utils';

    const defaultItemFilter = (label: string, filterText: string, _option: SelectItem): boolean =>
        `${label}`.toLowerCase().includes(filterText?.toLowerCase());

    const defaultOnError = (_error: SelectErrorEvent): void => {};
    const defaultOnLoaded = (_options: SelectItem[]): void => {};

    let timeout = $state<ReturnType<typeof setTimeout>>();

    let {
        // Core data props
        filterText = $bindable(''),
        itemId = 'value',
        items = $bindable<Item[] | string[] | null>(null),
        justValue = $bindable(),
        label = 'label',
        value = $bindable(),

        // UI props
        disabled = false,
        focused = $bindable(false),
        hasError = false,
        id = null,
        listOpen = $bindable(false),
        loading = $bindable(false),
        name = null,
        placeholder = 'Please select',
        placeholderAlwaysShow = false,
        showChevron = false,

        // Behavior props
        clearable = true,
        clearFilterTextOnBlur = true,
        closeListOnChange = true,
        filterSelectedItems = true,
        groupHeaderSelectable = false,
        multiFullItemClearable = false,
        multiple = false,
        required = false,
        searchable = true,
        useJustValue = false,

        // Styling props
        containerStyles = '',
        inputStyles = '',
        listStyle = '',
        hideEmptyState = false,

        // Advanced props
        debounceWait = 300,
        floatingConfig = {},
        hoverItemIndex = $bindable(0),
        inputAttributes = {},
        listAutoWidth = true,
        listOffset = 5,
        loadOptionsDeps = [],

        // Function props
        createGroupHeaderItem = (groupValue: string, _item: Item) => {
            return _createGroupHeaderItem(groupValue, label);
        },
        debounce = (fn: () => void, wait = 1) => {
            clearTimeout(timeout);
            timeout = setTimeout(fn, wait);
        },
        filter = _filter,
        groupBy = undefined,
        groupFilter = (groups: string[]) => groups,
        itemFilter = defaultItemFilter,
        loadOptions = undefined,

        // ARIA props
        ariaLabel = undefined,
        ariaFocused = () => {
            return `Select is focused, type to refine list, press down to open the menu.`;
        },
        ariaListOpen = (label: string, count: number) => {
            return `You are currently focused on option ${label}. There are ${count} results available.`;
        },
        ariaValues = (values: string) => {
            return `Option ${values}, selected.`;
        },

        // Custom behavior
        handleClear = internalHandleClear,

        // Event handlers
        onblur = () => {},
        onchange = () => {},
        onclear = () => {},
        onerror = defaultOnError,
        onfilter = () => {},
        onfocus = () => {},
        onhoveritem = () => {},
        oninput = () => {},
        onloaded = defaultOnLoaded,
        onselect = () => {},

        // Snippet props
        chevronIconSnippet,
        clearIconSnippet,
        emptySnippet,
        inputHiddenSnippet,
        itemSnippet,
        listAppendSnippet,
        listPrependSnippet,
        listSnippet,
        prependSnippet,
        loadingIconSnippet,
        multiClearIconSnippet,
        requiredSnippet,
        selectionSnippet,

        // DOM references (for binding)
        container = $bindable(undefined),
        input = $bindable(undefined),
        ...rest
    }: SelectProps<Item> = $props();

    let normalizedValue = $derived<SelectItem | SelectItem[] | null>(normalizeItem(value));

    const _uid = $props.id();
    const _generatedId = `svelte-select-${_uid}`;
    let _id = $derived(id ?? _generatedId);

    // Group headers render as options only when they are selectable; otherwise they are presentational
    const isPresentationalHeader = (item: SelectItem | undefined): boolean => !!item?.groupHeader && !item.selectable;

    const DEFAULT_INPUT_ATTRS = {
        autocapitalize: 'none',
        autocomplete: 'off',
        autocorrect: 'off',
        spellcheck: false,
        tabindex: 0,
        type: 'text',
        'aria-autocomplete': 'list',
    } as const;

    const ariaHandlers = useAriaHandlers({
        get ariaValues() {
            return ariaValues;
        },
        get ariaListOpen() {
            return ariaListOpen;
        },
        get ariaFocused() {
            return ariaFocused;
        },
    });

    function internalHandleClear(_e?: MouseEvent): void {
        selectState.clearState = true;
        onclear(value as SelectValue<Item>);
        value = undefined;
        closeList();
        handleFocus();
    }

    let list = $state<HTMLDivElement | undefined>();
    let filteredItems = $derived.by<SelectItem[]>(() =>
        filter({
            loadOptions,
            filterText,
            items,
            multiple,
            value: normalizedValue,
            itemId,
            groupBy,
            label,
            filterSelectedItems,
            itemFilter,
            convertStringItemsToObjects,
            filterGroupedItems,
        }),
    );
    let _inputAttributes = $derived<HTMLInputAttributes>({
        ...DEFAULT_INPUT_ATTRS,
        role: 'combobox',
        'aria-controls': listOpen ? `listbox-${_id}` : undefined,
        'aria-expanded': listOpen,
        'aria-haspopup': 'listbox',
        'aria-activedescendant':
            listOpen && filteredItems[hoverItemIndex] && !isPresentationalHeader(filteredItems[hoverItemIndex])
                ? `listbox-${_id}-item-${hoverItemIndex}`
                : undefined,
        'aria-label': ariaLabel ?? placeholder,
        'aria-required': required || undefined,
        'aria-invalid': hasError || undefined,
        readonly: !searchable,
        id: id ? id : undefined,
        ...inputAttributes,
    });
    let prefloat = $state(true);
    let hasValue = $derived(multiple ? Array.isArray(value) && value.length > 0 : !!value);
    let placeholderText = $derived(
        placeholderAlwaysShow && multiple
            ? placeholder
            : multiple && Array.isArray(value) && value.length === 0
              ? placeholder
              : value
                ? ''
                : placeholder,
    );
    let showClear = $derived(hasValue && clearable && !disabled && !loading);
    let hideSelectedItem = $derived(hasValue && filterText.length > 0);

    // Instance export — call via a bind:this reference
    export function getFilteredItems(): Item[] {
        return filteredItems as Item[];
    }

    let ariaSelection = $derived(
        value
            ? ariaHandlers.handleAriaSelection({
                  value,
                  filteredItems,
                  hoverItemIndex,
                  listOpen,
                  multiple,
                  label,
              })
            : '',
    );

    // svelte-floating-ui keeps a reference to this object; effects below mutate it in place
    let _floatingConfig = $state<FloatingConfig>({
        strategy: 'absolute',
        placement: 'bottom-start',
        autoUpdate: false,
    });

    // The shared reactive state object: live accessors over the props and derived
    // values above, plus internal shared state owned by the factory. Composables
    // read and write these fields directly.
    const selectState = createSelectState<Item>({
        get value() {
            return value;
        },
        set value(v) {
            value = v;
        },
        get items() {
            return items;
        },
        set items(v) {
            items = v;
        },
        get filterText() {
            return filterText;
        },
        set filterText(v) {
            filterText = v;
        },
        get justValue() {
            return justValue;
        },
        set justValue(v) {
            justValue = v;
        },
        get listOpen() {
            return listOpen;
        },
        set listOpen(v) {
            listOpen = v;
        },
        get loading() {
            return loading;
        },
        set loading(v) {
            loading = v;
        },
        get focused() {
            return focused;
        },
        set focused(v) {
            focused = v;
        },
        get hoverItemIndex() {
            return hoverItemIndex;
        },
        set hoverItemIndex(v) {
            hoverItemIndex = v;
        },
        get multiple() {
            return multiple;
        },
        get itemId() {
            return itemId;
        },
        get label() {
            return label;
        },
        get searchable() {
            return searchable;
        },
        get disabled() {
            return disabled;
        },
        get useJustValue() {
            return useJustValue;
        },
        get closeListOnChange() {
            return closeListOnChange;
        },
        get debounceWait() {
            return debounceWait;
        },
        get groupBy() {
            return groupBy;
        },
        get loadOptions() {
            return loadOptions;
        },
        get loadOptionsDeps() {
            return loadOptionsDeps;
        },
        get filteredItems() {
            return filteredItems;
        },
        get normalizedValue() {
            return normalizedValue;
        },
        get hasValue() {
            return hasValue;
        },
    });

    // The active-tag mechanism (ArrowLeft/ArrowRight + Backspace) is otherwise
    // only visible as a CSS outline; announce it so non-sighted users can use it
    let activeTagLabel = $derived(
        multiple && selectState.activeValue !== undefined && Array.isArray(value)
            ? ((value as Item[])[selectState.activeValue]?.[label] as string | undefined)
            : undefined,
    );
    let ariaContext = $derived(
        activeTagLabel !== undefined
            ? `${activeTagLabel} is active. Press Backspace to remove, or left and right arrow keys to move between selected options.`
            : ariaHandlers.handleAriaContent({
                  value,
                  filteredItems,
                  hoverItemIndex,
                  listOpen,
                  multiple,
                  label,
              }),
    );

    // Initialize composables (creation order is effect order: value, hover, load options)
    const valueManager = useValue(selectState, {
        closeList,
        oninput: (v) => oninput?.(v as SelectValue<Item>),
        onchange: (v) => onchange?.(v as SelectValue<Item>),
        onclear: (v) => onclear(v as SelectValue<Item>),
        onselect: (s) => onselect?.(s as Item),
    });

    const hoverManager = useHover(selectState);

    const loadOptionsManager = useLoadOptions(selectState, {
        debounce: (fn, wait) => debounce(fn, wait),
        onloaded: (opts) => onloaded(opts as Item[]),
        onerror: (err) => onerror(err),
    });

    const keyboardNav = useKeyboardNavigation(selectState, {
        closeList,
        setHoverIndex: hoverManager.setHoverIndex,
        handleSelect,
        handleMultiItemClear: valueManager.handleMultiItemClear,
    });

    // Keyboard navigation must keep the hovered option visible. This hooks the
    // key handler rather than an effect on hoverItemIndex so mouse hover never
    // triggers scrolling.
    function handleKeyDown(e: KeyboardEvent): void {
        keyboardNav.handleKeyDown(e);
        const isTypeAhead = !searchable && e.key.length === 1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End' || isTypeAhead) {
            void tick().then(scrollHoveredItemIntoView);
        }
    }

    function scrollHoveredItemIntoView(): void {
        if (!listOpen || !list) return;
        const el = document.getElementById(`listbox-${_id}-item-${hoverItemIndex}`);
        el?.scrollIntoView?.({ block: 'nearest' });
    }

    const [floatingRef, floatingContent, floatingUpdate] = createFloatingActions(_floatingConfig);

    onMount(() => {
        if (listOpen) focused = true;
        if (focused && input) input.focus();
    });

    // Keep the floating middleware in sync with listOffset. User overrides are
    // merged INTO _floatingConfig: svelte-floating-ui re-reads that object on its
    // own deferred/autoUpdate recomputes, so a merge into a throwaway copy would
    // be reverted one tick later.
    $effect.pre(() => {
        const middleware = [offset(listOffset), flip(), shift()];
        floatingConfig;
        untrack(() => {
            _floatingConfig.middleware = middleware;
            if (floatingConfig) Object.assign(_floatingConfig, floatingConfig);
            if (container && list) {
                floatingUpdate(_floatingConfig);
            }
        });
    });

    // Close list on unfocus
    $effect(() => {
        if (!focused && input) closeList();
    });

    // Setup filter text
    $effect(() => {
        filterText;
        untrack(() => {
            if (filterText !== selectState.prevFilterText) setupFilterText();
        });
    });

    // Fire onhoveritem
    $effect(() => {
        onhoveritem?.(hoverItemIndex);
    });

    // Fire onfilter
    $effect(() => {
        if (filteredItems && listOpen) onfilter?.(filteredItems as Item[]);
    });

    // Floating UI config
    $effect(() => {
        if (container && floatingConfig) {
            untrack(() => {
                Object.assign(_floatingConfig, floatingConfig);
                floatingUpdate(_floatingConfig);
            });
        }
    });

    // List mounted
    $effect(() => {
        listOpen;
        untrack(() => {
            listMounted(list, listOpen);
            if (listOpen && container && list) {
                setListWidth();
                // Opening with a value starts hovered on that value; bring it into view
                void tick().then(scrollHoveredItemIntoView);
            }
        });
    });

    // Focus when list opens
    $effect(() => {
        if (input && listOpen && !focused) handleFocus();
    });

    // Auto update floating config
    $effect(() => {
        if (container && floatingConfig?.autoUpdate === undefined) {
            _floatingConfig.autoUpdate = true;
        }
    });

    // Disabled state
    $effect(() => {
        if (disabled) {
            listOpen = false;
            filterText = '';
        }
    });

    function filterGroupedItems(_items: SelectItem[]): SelectItem[] {
        if (!groupBy) return _items;

        const groupValues: string[] = [];
        const groups: Record<string, SelectItem[]> = {};

        _items.forEach((item) => {
            const groupValue: string = groupBy(item as Item);

            if (!groupValues.includes(groupValue)) {
                groupValues.push(groupValue);
                groups[groupValue] = [];
                if (groupValue) {
                    groups[groupValue].push(
                        Object.assign(createGroupHeaderItem(groupValue, item as Item), {
                            id: groupValue,
                            groupHeader: true,
                            selectable: groupHeaderSelectable,
                        }),
                    );
                }
            }

            groups[groupValue].push(Object.assign({ groupItem: !!groupValue }, item));
        });

        const sortedGroupedItems: SelectItem[] = [];

        groupFilter(groupValues).forEach((groupValue: string) => {
            if (groups[groupValue]) sortedGroupedItems.push(...groups[groupValue]);
        });

        return sortedGroupedItems;
    }

    function setupFilterText() {
        if (loadOptions) {
            if (filterText.length > 0 && !listOpen) {
                listOpen = true;
            }
            return;
        }

        if (filterText.length === 0) return;

        listOpen = true;

        if (multiple) {
            selectState.activeValue = undefined;
        }
    }

    function handleFocus(e?: FocusEvent): void {
        if (focused && input === document?.activeElement) return;
        if (e) {
            onfocus?.(e);
        }
        input?.focus();
        focused = true;
    }

    async function handleBlur(e?: FocusEvent): Promise<void> {
        if (selectState.isScrolling) return;
        if (listOpen || focused) {
            if (e) onblur?.(e);
            closeList();
            focused = false;
            selectState.activeValue = undefined;
            input?.blur();
        }
    }

    function handleClick(ev: MouseEvent) {
        ev.preventDefault();
        if (disabled) return;
        if (filterText && filterText.length > 0) return (listOpen = true);
        listOpen = !listOpen;
    }

    function closeList() {
        if (clearFilterTextOnBlur) {
            filterText = '';
        }
        listOpen = false;
        // A load armed by typing must not fire (spinner + stale items) on a closed list;
        // reads through the effect miss this when clearFilterTextOnBlur is false
        loadOptionsManager.cancelPendingFilterLoad();
    }

    onDestroy(() => {
        // The floating list can outlive the component's own tree; remove it explicitly
        // eslint-disable-next-line svelte/no-dom-manipulating
        list?.remove();
        // A debounced load firing after unmount would fetch and invoke callbacks
        // on a dead component
        clearTimeout(timeout);
        clearTimeout(prefloatTimeout);
        loadOptionsManager.invalidateLoads();
    });

    function handleSelect(item: SelectItem): void {
        if (!item || item.selectable === false) return;
        valueManager.itemSelected(item);
    }

    function handleItemClick(item: SelectItem, i: number): void {
        if (item?.selectable === false) return;
        if (!multiple && !Array.isArray(normalizedValue) && areItemsEqual(normalizedValue, item, itemId))
            return closeList();
        if (hoverManager.isItemSelectable(item)) {
            hoverItemIndex = i;
            handleSelect(item);
        }
    }

    function setListWidth(): void {
        if (!container || !list) return;
        const { width } = container.getBoundingClientRect();
        list.style.width = listAutoWidth ? width + 'px' : 'auto';
    }

    let prefloatTimeout: ReturnType<typeof setTimeout> | undefined;
    function listMounted(list: HTMLDivElement | undefined, listOpen: boolean) {
        if (!list || !listOpen) return (prefloat = true);
        clearTimeout(prefloatTimeout);
        prefloatTimeout = setTimeout(() => {
            prefloat = false;
        }, 0);
    }

    function handleInput(ev: Event): void {
        const target = ev.target as HTMLInputElement;
        listOpen = true;
        selectState.prevFilterText = filterText;
        filterText = target.value;
    }

    export function reset(): void {
        selectState.clearState = true;
        value = undefined;
        filterText = '';
        listOpen = false;
        hoverItemIndex = 0;
        selectState.activeValue = undefined;
        justValue = undefined;
        focused = false;
    }
</script>

<!-- Outside clicks close the list via the input's native blur -->
<svelte:window onkeydown={handleKeyDown} />

<div
    class="svelte-select {rest.class}"
    class:multi={multiple}
    class:disabled
    class:focused
    class:list-open={listOpen}
    class:show-chevron={showChevron}
    class:error={hasError}
    style={containerStyles}
    onpointerup={handleClick}
    bind:this={container}
    use:floatingRef
    role="none">
    {#if listOpen}
        <div
            use:floatingContent
            bind:this={list}
            class="svelte-select-list"
            class:prefloat
            style={listStyle}
            onscroll={hoverManager.handleListScroll}
            onscrollend={hoverManager.handleListScrollEnd}
            onpointerup={(ev) => {
                if (ev.pointerType === 'mouse') ev.preventDefault();
                ev.stopPropagation();
            }}
            onmousedown={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
            }}
            role="listbox"
            tabindex="-1"
            aria-multiselectable={multiple || undefined}
            id="listbox-{_id}">
            {#if listPrependSnippet}
                {@render listPrependSnippet()}
            {/if}
            {#if listSnippet}
                {@render listSnippet(filteredItems as Item[])}
            {:else if filteredItems?.length > 0}
                {#each filteredItems as item, i}
                    <div
                        onmouseover={() => hoverManager.handleHover(i)}
                        onfocus={() => hoverManager.handleHover(i)}
                        onclick={(ev) => {
                            ev.stopPropagation();
                            handleItemClick(item, i);
                        }}
                        onkeydown={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                        }}
                        class="list-item"
                        tabindex="-1"
                        role={isPresentationalHeader(item) ? 'presentation' : 'option'}
                        id="listbox-{_id}-item-{i}"
                        aria-selected={isPresentationalHeader(item) ? undefined : hoverManager.isItemActive(item)}
                        aria-disabled={isPresentationalHeader(item) || isItemSelectableCheck(item) ? undefined : true}>
                        <!-- No role="group" here: in this flat listbox the header row is a sibling
                             of its options, and option/presentation roles may not contain a group -->
                        <div
                            class="item"
                            class:list-group-title={item.groupHeader}
                            class:active={hoverManager.isItemActive(item)}
                            class:first={i === 0}
                            class:hover={hoverItemIndex === i}
                            class:group-item={item.groupItem}
                            class:not-selectable={item?.selectable === false}>
                            {#if itemSnippet}
                                {@render itemSnippet(item as Item, i)}
                            {:else}
                                {item?.[label]}
                            {/if}
                        </div>
                    </div>
                {/each}
            {:else if !hideEmptyState}
                {#if emptySnippet}
                    {@render emptySnippet()}
                {:else if !loading}
                    <div class="empty">No options</div>
                {:else}
                    <div class="empty">Loading Data</div>
                {/if}
            {/if}
            {#if listAppendSnippet}
                {@render listAppendSnippet()}
            {/if}
        </div>
    {/if}

    <span aria-live="polite" aria-atomic="false" aria-relevant="additions text" class="a11y-text">
        {#if focused}
            <span id="aria-selection">{ariaSelection}</span>
            <span id="aria-context">
                {ariaContext}
            </span>
        {/if}
    </span>

    <div class="prepend">
        {#if prependSnippet}
            {@render prependSnippet()}
        {/if}
    </div>

    <div class="value-container">
        {#if hasValue}
            {#if multiple}
                {#each Array.isArray(value) ? (value as Item[]) : [] as item, i}
                    <div
                        class="multi-item"
                        class:active={selectState.activeValue === i}
                        class:disabled
                        onclick={(ev) => {
                            ev.preventDefault();
                            return multiFullItemClearable ? valueManager.handleMultiItemClear(i) : {};
                        }}
                        role="none">
                        <span class="multi-item-text">
                            {#if selectionSnippet}
                                {@render selectionSnippet(item, i)}
                            {:else}
                                {item[label]}
                            {/if}
                        </span>

                        {#if !disabled && !multiFullItemClearable && ClearIcon}
                            <!-- A real button: keyboard-focusable, Enter/Space activate via click.
                                 mousedown is prevented so a mouse removal never steals focus from
                                 the input; pointerup must not bubble to the container's list toggle. -->
                            <button
                                type="button"
                                class="multi-item-clear"
                                aria-label={`Remove ${item[label]}`}
                                onmousedown={(ev) => ev.preventDefault()}
                                onpointerup={(ev) => ev.stopPropagation()}
                                onclick={(ev) => {
                                    ev.stopPropagation();
                                    valueManager.handleMultiItemClear(i);
                                    handleFocus();
                                }}>
                                {#if multiClearIconSnippet}
                                    {@render multiClearIconSnippet()}
                                {:else}
                                    <ClearIcon />
                                {/if}
                            </button>
                        {/if}
                    </div>
                {/each}
            {:else}
                <div class="selected-item" class:hide-selected-item={hideSelectedItem}>
                    {#if selectionSnippet}
                        {@render selectionSnippet(value as Item)}
                    {:else}
                        {!Array.isArray(normalizedValue) ? normalizedValue?.[label] : ''}
                    {/if}
                </div>
            {/if}
        {/if}

        <input
            onkeydown={handleKeyDown}
            onblur={handleBlur}
            oninput={handleInput}
            onfocus={handleFocus}
            {..._inputAttributes}
            bind:this={input}
            value={filterText}
            placeholder={placeholderText}
            style={inputStyles}
            {disabled} />
    </div>

    <div class="indicators">
        {#if loading}
            <div class="icon loading" aria-hidden="true">
                {#if loadingIconSnippet}
                    {@render loadingIconSnippet()}
                {:else}
                    <LoadingIcon />
                {/if}
            </div>
        {/if}

        {#if showClear}
            <button type="button" class="icon clear-select" aria-label="Clear selection" onclick={handleClear}>
                {#if clearIconSnippet}
                    {@render clearIconSnippet()}
                {:else}
                    <ClearIcon />
                {/if}
            </button>
        {/if}

        {#if showChevron}
            <div class="icon chevron" aria-hidden="true">
                {#if chevronIconSnippet}
                    {@render chevronIconSnippet(listOpen)}
                {:else}
                    <ChevronIcon />
                {/if}
            </div>
        {/if}
    </div>
    {#if inputHiddenSnippet}
        {@render inputHiddenSnippet(value as SelectValue<Item>)}
    {:else if multiple && Array.isArray(value) && value.length > 0}
        {#each value as Item[] as item}
            <input {name} type="hidden" value={useJustValue ? item[itemId] : JSON.stringify(item)} />
        {/each}
    {:else if !multiple}
        <input {name} type="hidden" value={value ? (useJustValue ? justValue : JSON.stringify(value)) : ''} />
    {/if}

    {#if required && (!value || (Array.isArray(value) && value.length === 0))}
        {#if requiredSnippet}
            {@render requiredSnippet(value as SelectValue<Item>)}
        {:else}
            <select class="required" required tabindex="-1" aria-hidden="true"></select>
        {/if}
    {/if}
</div>

<style>
    @import './styles/default.css';
</style>
