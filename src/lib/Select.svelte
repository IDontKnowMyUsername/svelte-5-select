<svelte:options runes={true} />
<script lang="ts">
    import { onDestroy, onMount, untrack } from 'svelte';
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
    import { useKeyboardNavigation } from '$lib/keyboard-navigation.svelte';
    import { useHover } from '$lib/use-hover.svelte';
    import { useValue } from '$lib/use-value.svelte';
    import { useLoadOptions } from '$lib/use-load-options.svelte';
    import { areItemsEqual, isItemSelectableCheck, createGroupHeaderItem as _createGroupHeaderItem } from '$lib/utils';

    const defaultItemFilter = (label: string, filterText: string, option: SelectItem): boolean =>
        `${label}`.toLowerCase().includes(filterText?.toLowerCase());

    const defaultOnError = (error: SelectErrorEvent): void => {};
    const defaultOnLoaded = (options: SelectItem[]): void => {};
    const defaultHandleClear = (e?: MouseEvent): void => {};

    let timeout = $state<ReturnType<typeof setTimeout>>();
    let clearState = $state(false);

    let {
        // Core data props
        filterText = $bindable(''),
        itemId = 'value',
        items = $bindable<SelectItem[] | string[] | null>(null),
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
        createGroupHeaderItem = (groupValue: string, item: SelectItem) => {
            return _createGroupHeaderItem(groupValue, item, label);
        },
        debounce = (fn: () => void, wait = 1) => {
            clearTimeout(timeout);
            timeout = setTimeout(fn, wait);
        },
        filter = _filter,
        getFilteredItems = () => {
            return filteredItems;
        },
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
        handleClear = defaultHandleClear,

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
        container = undefined,
        input = undefined,
        ...rest
    }: SelectProps = $props();

    let normalizedValue = $derived<SelectItem | SelectItem[] | null>(
        !value
            ? null
            : typeof value === 'string'
                ? { value, label: value }
                : value
    );

    const _generatedId = `svelte-select-${Math.random().toString(36).slice(2, 9)}`;
    let _id = $derived(id ?? _generatedId);

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
        ariaValues,
        ariaListOpen,
        ariaFocused,
    });

    handleClear = (e?: MouseEvent): void => {
        clearState = true;
        onclear(value as SelectValue);
        value = undefined;
        closeList();
        handleFocus();
    };

    let list = $state<HTMLDivElement | undefined>();
    let _inputAttributes = $derived<HTMLInputAttributes>({
        ...DEFAULT_INPUT_ATTRS,
        role: 'combobox',
        'aria-controls': listOpen ? `listbox-${_id}` : undefined,
        'aria-expanded': listOpen,
        'aria-haspopup': 'listbox',
        'aria-activedescendant': listOpen ? `listbox-${_id}-item-${hoverItemIndex}` : undefined,
        'aria-label': ariaLabel,
        tabindex: 0,
        readonly: !searchable,
        id: id ? id : undefined,
        ...inputAttributes,
    });
    let activeValue = $state<number | undefined>(undefined);
    let prev_value = $state<SelectItem | SelectItem[] | string | null | undefined>();
    let prev_filterText: string | undefined = $state();
    let prev_multiple = $state();
    let isScrolling = $state(false);
    let prefloat = $state(true);
    let hasValue = $state(false);
    let placeholderText = $derived(
        placeholderAlwaysShow && multiple
            ? placeholder
            : multiple && value?.length === 0
                ? placeholder
                : value ? '' : placeholder
    );
    let showClear = $derived(
        hasValue && clearable && !disabled && !loading
    );
    let hideSelectedItem = $derived(
        hasValue && filterText.length > 0
    );
    let filteredItems = $state<SelectItem[]>([]);

    let ariaContext = $derived(
        ariaHandlers.handleAriaContent({
            value,
            filteredItems,
            hoverItemIndex,
            listOpen,
            multiple,
            label,
        })
    );
    let ariaSelection = $derived(
        value ? ariaHandlers.handleAriaSelection({
            value,
            filteredItems,
            hoverItemIndex,
            listOpen,
            multiple,
            label,
        }) : ''
    );

    let _floatingConfig = $state<FloatingConfig>({
        strategy: 'absolute',
        placement: 'bottom-start',
        middleware: [offset(listOffset), flip(), shift()],
        autoUpdate: false,
    });

    // Initialize composables
    const valueManager = useValue({
        getState: () => ({
            value,
            prevValue: prev_value,
            items,
            multiple,
            itemId,
            label,
            hasValue,
            normalizedValue,
            useJustValue,
            justValue,
            clearState,
            closeListOnChange,
        }),
        setValue: (v) => value = v,
        setJustValue: (v) => justValue = v,
        setPrevValue: (v) => prev_value = v,
        setClearState: (v) => clearState = v,
        setActiveValue: (v) => activeValue = v,
        setFilterText: (v) => filterText = v,
        closeList,
        oninput: (v) => oninput?.(v as SelectValue),
        onchange: (v) => onchange?.(v as SelectValue),
        onclear: (v) => onclear(v as SelectValue),
        onselect: (s) => onselect?.(s),
    });

    const hoverManager = useHover({
        getState: () => ({
            listOpen,
            filteredItems,
            hoverItemIndex,
            multiple,
            value,
            isScrolling,
            groupBy,
            itemId,
        }),
        setHoverItemIndex: (v) => hoverItemIndex = v,
        setIsScrolling: (v) => isScrolling = v,
        onhoveritem: (i) => onhoveritem?.(i),
    });

    const loadOptionsManager = useLoadOptions({
        getState: () => ({
            filterText,
            prevFilterText: prev_filterText,
            loadOptionsDeps,
            loadOptions,
            disabled,
            multiple,
            value,
            items,
            itemId,
            useJustValue,
            justValue,
            listOpen,
            debounceWait,
        }),
        setItems: (v) => items = v,
        setValue: (v) => value = v,
        setJustValue: (v) => justValue = v,
        setLoading: (v) => loading = v,
        setListOpen: (v) => listOpen = v,
        debounce,
        convertStringItemsToObjects: valueManager.convertStringItemsToObjects,
        onloaded: (opts) => onloaded(opts),
        onerror: (err) => onerror(err),
    });

    const keyboardNav = useKeyboardNavigation({
        getState: () => ({
            listOpen,
            filteredItems,
            hoverItemIndex,
            multiple,
            value,
            filterText,
            activeValue,
            itemId,
            focused,
        }),
        setListOpen: (v) => listOpen = v,
        setHoverItemIndex: (v) => hoverItemIndex = v,
        setActiveValue: (v) => activeValue = v,
        closeList,
        setHoverIndex: hoverManager.setHoverIndex,
        handleSelect,
        handleMultiItemClear: valueManager.handleMultiItemClear,
    });
    const handleKeyDown = keyboardNav.handleKeyDown;

    const [floatingRef, floatingContent, floatingUpdate] = createFloatingActions(_floatingConfig);

    onMount(() => {
        if (listOpen) focused = true;
        if (focused && input) input.focus();
    });

    // Filter items
    $effect.pre(() => {
        filterText;
        value;
        items;
        untrack(
            () =>
                (filteredItems = filter({
                    loadOptions: undefined,
                    filterText,
                    items,
                    multiple,
                    value: normalizedValue,
                    itemId,
                    groupBy,
                    label,
                    filterSelectedItems,
                    itemFilter,
                    convertStringItemsToObjects: valueManager.convertStringItemsToObjects,
                    filterGroupedItems,
                })),
        );
    });

    // Set value on hasValue change
    $effect(() => {
        hasValue;
        untrack(() => {
            if (items) valueManager.setValue();
        });
    });

    // Setup multi when multiple changes
    $effect(() => {
        if (multiple) {
            untrack(() => valueManager.setupMulti());
        }
    });

    // Clear value when switching from multiple to single
    $effect(() => {
        if (prev_multiple && !multiple && value) {
            value = null;
        }
        prev_multiple = multiple;
    });

    // Check for duplicates
    $effect(() => {
        if (multiple && value && value.length > 1) {
            untrack(() => valueManager.checkValueForDuplicates());
        }
    });

    // Dispatch selected item
    $effect(() => {
        if (value) {
            untrack(() => valueManager.dispatchSelectedItem());
        }
    });

    // Value cleared notification
    $effect(() => {
        if (prev_value && !value) {
            oninput?.((value || []) as SelectValue);
        }
    });

    // Close list on unfocus
    $effect(() => {
        if (!focused && input) closeList();
    });

    // Setup filter text
    $effect(() => {
        filterText;
        untrack(() => {
            if (filterText !== prev_filterText) setupFilterText();
        });
    });

    // Set value index as hover when list opens
    $effect(() => {
        if (!multiple && listOpen && value && filteredItems) {
            untrack(() => hoverManager.setValueIndexAsHoverIndex());
        }
    });

    // Fire onhoveritem
    $effect(() => {
        onhoveritem?.(hoverItemIndex);
    });

    // Compute hasValue
    $effect(() => {
        multiple;
        value;
        untrack(() => {
            hasValue = multiple
                ? !!(value && value.length > 0)
                : !!value;
        });
    });

    // Compute justValue
    $effect(() => {
        multiple;
        itemId;
        value;
        untrack(() => {
            justValue = valueManager.computeJustValue();
        });
    });

    // Check hover selectable
    $effect(() => {
        filteredItems;
        value;
        multiple;
        listOpen;
        untrack(() => {
            if (listOpen && filteredItems.length > 0) {
                if (!isItemSelectableCheck(filteredItems[hoverItemIndex])) {
                    hoverManager.checkHoverSelectable();
                } else if (groupBy && hoverItemIndex === 0) {
                    hoverManager.checkHoverSelectable();
                }
            }
        });
    });

    // Fire onfilter
    $effect(() => {
        if (filteredItems && listOpen) onfilter?.(filteredItems);
    });

    // Floating UI config
    $effect(() => {
        if (container && floatingConfig) floatingUpdate({..._floatingConfig, ...floatingConfig});
    });

    // List mounted
    $effect(() => {
        listOpen;
        untrack(() => {
            listMounted(list, listOpen);
            if (listOpen && container && list) setListWidth();
        });
    });

    // Focus when list opens
    $effect(() => {
        if (input && listOpen && !focused) handleFocus();
    });

    // Reset hover on filterText change
    $effect(() => {
        if (filterText) {
            untrack(() => {
                hoverItemIndex = hoverManager.getFirstSelectableIndex();
            });
        }
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

    // Load options handler
    $effect(() => {
        const currentFilterText = filterText;
        const currentDeps = [...loadOptionsDeps];

        if (loadOptions) {
            untrack(() => {
                loadOptionsManager.handleLoadOptions(currentFilterText, currentDeps);
            });

            // Keep outside untrack for proper reactivity
            if (!disabled && currentFilterText.length > 0 && !listOpen) {
                listOpen = true;
            }
        }
    });

    function filterGroupedItems(_items: SelectItem[]): SelectItem[] {
        if (!groupBy) return _items;

        const groupValues: string[] = [];
        const groups: Record<string, SelectItem[]> = {};

        _items.forEach((item) => {
            const groupValue: string = groupBy(item);

            if (!groupValues.includes(groupValue)) {
                groupValues.push(groupValue);
                groups[groupValue] = [];
                if (groupValue) {
                    groups[groupValue].push(
                        Object.assign(createGroupHeaderItem(groupValue, item), {
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
            activeValue = undefined;
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
        if (isScrolling) return;
        if (listOpen || focused) {
            if (e) onblur?.(e);
            closeList();
            focused = false;
            activeValue = undefined;
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
    }

    function handleClickOutside(event: MouseEvent): void {
        const target = event.target as Node;
        if (!listOpen && !focused && container && !container.contains(target) && !list?.contains(target)) {
            handleBlur();
        }
    }

    onDestroy(() => {
        list?.remove();
    });

    function handleSelect(item: SelectItem): void {
        if (!item || item.selectable === false) return;
        valueManager.itemSelected(item);
    }

    function handleItemClick(item: SelectItem, i: number): void {
        if (item?.selectable === false) return;
        if (!multiple && areItemsEqual(normalizedValue, item, itemId)) return closeList();
        if (hoverManager.isItemSelectable(item)) {
            hoverItemIndex = i;
            handleSelect(item);
        }
    }

    function setListWidth():void {
        if (!container || !list) return;
        const { width } = container.getBoundingClientRect();
        list.style.width = listAutoWidth ? width + 'px' : 'auto';
    }

    function listMounted(list: HTMLDivElement | undefined, listOpen: boolean) {
        if (!list || !listOpen) return (prefloat = true);
        setTimeout(() => {
            prefloat = false;
        }, 0);
    }

    function handleInput(ev: Event): void {
        const target = ev.target as HTMLInputElement;
        listOpen = true;
        prev_filterText = filterText;
        filterText = target.value;
    }

    export function reset(): void {
        clearState = true;
        value = undefined;
        filterText = '';
        listOpen = false;
        hoverItemIndex = 0;
        activeValue = undefined;
        justValue = undefined;
        focused = false;
    }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeyDown} />

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
                ev.preventDefault();
                ev.stopPropagation();
            }}
            onmousedown={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
            }}
            role="listbox"
            id="listbox-{_id}">
            {#if listPrependSnippet}
                {@render listPrependSnippet()}
            {/if}
            {#if listSnippet}
                {@render listSnippet(filteredItems)}
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
                        role={item.groupHeader ? 'presentation' : 'option'}
                        id="listbox-{_id}-item-{i}"
                        aria-selected={item.groupHeader ? undefined : hoverManager.isItemActive(item, normalizedValue, itemId) || false}>
                        <div
                            class="item"
                            class:list-group-title={item.groupHeader}
                            class:active={hoverManager.isItemActive(item, normalizedValue, itemId)}
                            class:first={i === 0}
                            class:hover={hoverItemIndex === i}
                            class:group-item={item.groupItem}
                            class:not-selectable={item?.selectable === false}
                            role={item.groupHeader ? 'group' : undefined}
                            aria-label={item.groupHeader ? item[label] : undefined}>
                            {#if itemSnippet}
                                {@render itemSnippet(item, i)}
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

    <span aria-live="polite" aria-atomic="false" aria-relevant="additions" class="a11y-text">
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
                {#each (Array.isArray(value) ? value : []) as item, i}
                    <div
                        class="multi-item"
                        class:active={activeValue === i}
                        class:disabled
                        onclick={(ev) => {
                            ev.preventDefault();
                            return multiFullItemClearable ? valueManager.handleMultiItemClear(i) : {};
                        }}
                        onkeydown={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
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
                            <div
                                class="multi-item-clear"
                                onpointerup={(ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    valueManager.handleMultiItemClear(i);
                                }}>
                                {#if multiClearIconSnippet}
                                    {@render multiClearIconSnippet()}
                                {:else}
                                    <ClearIcon />
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/each}
            {:else}
                <div class="selected-item" class:hide-selected-item={hideSelectedItem}>
                    {#if selectionSnippet}
                        {@render selectionSnippet(value as SelectItem)}
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
            readOnly={!searchable}
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
            <button type="button" class="icon clear-select" onclick={handleClear}>
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
        {@render inputHiddenSnippet(value as SelectValue)}
    {:else if multiple && Array.isArray(value) && value.length > 0}
        {#each value as item}
            <input {name} type="hidden" value={useJustValue ? item[itemId] : JSON.stringify(item)} />
        {/each}
    {:else if !multiple}
        <input {name} type="hidden" value={value ? (useJustValue ? justValue : JSON.stringify(value)) : ''} />
    {/if}

    {#if required && (!value || value.length === 0)}
        {#if requiredSnippet}
            {@render requiredSnippet(value as SelectValue)}
        {:else}
            <select class="required" required tabindex="-1" aria-hidden="true"></select>
        {/if}
    {/if}
</div>

<style>
    @import './styles/default.css';
</style>
