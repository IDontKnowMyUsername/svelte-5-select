<svelte:options runes={true} />
<script lang="ts">
    import { onDestroy, onMount, untrack } from 'svelte';
    import { offset, flip, shift } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';
    import type { FloatingConfig, SelectProps } from './types';
    import { useAriaHandlers } from './aria-handlers.svelte';

    import _filter from './filter';

    import ChevronIcon from './ChevronIcon.svelte';
    import ClearIcon from './ClearIcon.svelte';
    import LoadingIcon from './LoadingIcon.svelte';
    import type { SelectItem } from './types';
    import type { HTMLInputAttributes } from 'svelte/elements';
    import { useKeyboardNavigation } from './keyboard-navigation.svelte';
    import { areItemsEqual, hasValueChanged, isItemSelectableCheck, createGroupHeaderItem as _createGroupHeaderItem } from './utils';

    const defaultItemFilter = (label: string, filterText: string, option: SelectItem): boolean =>
        `${label}`.toLowerCase().includes(filterText?.toLowerCase());

    const defaultOnError = (error: any): void => {};
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
        onclear(value);
        value = undefined;
        closeList();
        handleFocus();
    };

    let list = $state<HTMLDivElement | undefined>();
    let _inputAttributes = $derived<HTMLInputAttributes>({
        ...DEFAULT_INPUT_ATTRS,
        role: multiple ? 'combobox' : 'combobox',
        'aria-controls': listOpen ? `listbox-${id}` : undefined,
        'aria-expanded': listOpen,
        'aria-haspopup': 'listbox',
        tabindex: 0,
        readonly: !searchable,
        id: id ? id : undefined,
        ...inputAttributes,
    });
    let activeValue = $state<number | undefined>(undefined);
    let prev_value = $state<SelectItem | SelectItem[] | string | null | undefined>();
    let prev_filterText = $state();
    let prev_multiple = $state();
    let isScrollingTimer = $state<ReturnType<typeof setTimeout>>();
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
        setHoverIndex,
        handleSelect,
        handleMultiItemClear,
    });
    const handleKeyDown = keyboardNav.handleKeyDown;

    const [floatingRef, floatingContent, floatingUpdate] = createFloatingActions(_floatingConfig);

    onMount(() => {
        if (listOpen) focused = true;
        if (focused && input) input.focus();
    });
    $effect.pre(() => {
        filterText;
        value;
        items;
        untrack(
            () =>
                (filteredItems = filter({
                    loadOptions: undefined, // Don't pass loadOptions - items are already loaded
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
                })),
        );
    });
    $effect(() => {
        hasValue;
        untrack(() => {
            if (items) setValue();
        });
    });
    $effect(() => {
        // Used when multiple is dynamically set
        if (multiple) {
            untrack(() => setupMulti());
        }
    });
    $effect(() => {
        // Check BEFORE updating prev_multiple
        if (prev_multiple && !multiple && value) {
            value = null;
        }
        // Update prev_multiple AFTER the check
        prev_multiple = multiple;
    });
    $effect(() => {
        if (multiple && value && value.length > 1) checkValueForDuplicates();
    });
    $effect(() => {
        if (value) dispatchSelectedItem();
    });
    $effect(() => {
        if (prev_value && !value) {
            oninput?.(value || []);
        }
    });
    $effect(() => {
        if (!focused && input) closeList();
    });
    $effect(() => {
        filterText;
        untrack(() => {
            if (filterText !== prev_filterText) setupFilterText();
        });
    });
    $effect(() => {
        if (!multiple && listOpen && value && filteredItems) setValueIndexAsHoverIndex();
    });
    $effect(() => {
        onhoveritem?.(hoverItemIndex);
    });
    $effect(() => {
        multiple;
        value;
        untrack(() => {
            hasValue = multiple
                ? !!(value && value.length > 0)
                : !!value;
        });
    });
    $effect(() => {
        multiple;
        itemId;
        value;
        untrack(() => {
            justValue = computeJustValue();
        });
    });

    $effect(() => {
        filteredItems;
        value;
        multiple;
        listOpen;
        untrack(() => {
            if (listOpen && filteredItems.length > 0) {
                if (!isItemSelectableCheck(filteredItems[hoverItemIndex])) {
                    checkHoverSelectable();
                }
                // Or always check when list opens with groupBy
                else if (groupBy && hoverItemIndex === 0) {
                    checkHoverSelectable();
                }
            }
        });
    });
    $effect(() => {
        if (filteredItems && listOpen) onfilter?.(filteredItems);
    });
    $effect(() => {
        if (container && floatingConfig) floatingUpdate({..._floatingConfig, ...floatingConfig});
    });
    $effect(() => {
        listOpen;
        untrack(() => {
            listMounted(list, listOpen);
            if (listOpen && container && list) setListWidth();
        });
    });
    $effect(() => {
        if (input && listOpen && !focused) handleFocus();
    });
    $effect(() => {
        if (filterText) {
            untrack(() => {
                hoverItemIndex = getFirstSelectableIndex();
            });
        }
    });
    $effect(() => {
        if (container && floatingConfig?.autoUpdate === undefined) {
            _floatingConfig.autoUpdate = true;
        }
    });
    $effect(() => {
        if (disabled) {
            listOpen = false;
            filterText = '';
        }
    });
    $effect(() => {
        // Watch both filterText and loadOptionsDeps for changes
        const currentFilterText = filterText;
        loadOptionsDeps.forEach(dep => dep);

        if (loadOptions && !disabled) {
            // Use untrack to prevent infinite loops when setting items/value/loading
            untrack(() => {
                loading = true;

                // Determine if this is a filterText change (needs debounce) or deps change (immediate)
                const isFilterTextChange = currentFilterText !== prev_filterText;

                const executeLoad = async () => {
                    try {
                        const result = await loadOptions(currentFilterText);

                        // Check if result is string array and convert to SelectItem objects
                        if (result && result.length > 0 && typeof result[0] === 'string') {
                            items = convertStringItemsToObjects(result as string[]);
                        } else {
                            // Force reactivity with a new reference and proper typing
                            items = result ? (result.slice() as typeof items) : null;
                        }

                        // Clear value if it's not in the new items list
                        if (value && items && items.length > 0) {
                            const valueExists = multiple
                                ? Array.isArray(value) && value.every((v: any) =>
                                items?.some((item: any) =>
                                    (typeof item === 'string' ? item : item[itemId]) === (typeof v === 'string' ? v : v[itemId])
                                )
                            )
                                : items.some((item: any) =>
                                    (typeof item === 'string' ? item : item[itemId]) === (typeof value === 'string' ? value : (value as any)[itemId])
                                );

                            if (!valueExists) {
                                value = multiple ? [] : undefined;
                            }
                        } else if (value && (!items || items.length === 0)) {
                            // Clear value if items is empty
                            value = multiple ? [] : undefined;
                        }

                        loading = false;
                        // Ensure items is SelectItem[] for onloaded callback
                        onloaded((items || []) as SelectItem[]);
                    } catch (err) {
                        console.error('loadOptions error:', err);
                        // Pass the raw error to match expected behavior
                        onerror(err as any);
                        items = null;
                        loading = false;
                    }
                };

                // Use debounce for filterText changes, immediate for deps changes
                if (isFilterTextChange) {
                    debounce(executeLoad, debounceWait);
                } else {
                    executeLoad();
                }
            });

            // Set listOpen outside untrack so it triggers reactivity
            if (currentFilterText.length > 0 && !listOpen) {
                listOpen = true;
            }
        }
    });

    function getFirstSelectableIndex(): number {
        if (!groupBy || filteredItems.length === 0) return 0;

        if (!isItemSelectableCheck(filteredItems[0])) {
            const firstSelectable = filteredItems.findIndex(isItemSelectableCheck);
            return firstSelectable >= 0 ? firstSelectable : 0;
        }

        return 0;
    }

    function findItemByValue(id: any): SelectItem | undefined {
        return (items as SelectItem[])?.find(item => item[itemId] === id);
    }

    function itemSelected(selection: SelectItem) {
        if (selection) {
            filterText = '';
            const item = Object.assign({}, selection);

            if (item.groupHeader && !item.selectable) return;
            setValue();
            updateValueDisplay(items);
            value = multiple ? (value ? value.concat([item]) : [item]) : (value = item);

            if (closeListOnChange) closeList();
            activeValue = undefined;
            onchange?.(value);
            onselect?.(selection);
        }
    }

    function setValue() {
        prev_value = value;
        if (typeof value === 'string') {
            let item = findItemByValue(value);
            value = item || {
                [itemId]: value,
                label: value,
            };
        } else if (multiple && Array.isArray(value) && value.length > 0) {
            value = value.map((val) => {
                if (typeof val === 'string') {
                    // Look up each string value in items
                    let item = findItemByValue(val);
                    return item || { value: val, label: val };
                }
                return val;
            });
        }
    }

    function updateValueDisplay(items?: SelectItem[] | string[] | null): void {
        if (!items || items.length === 0 || items.some((item) => typeof item !== 'object')) return;
        if (!value) return;  // Change back to value

        if (Array.isArray(value)) {  // Change back to value
            if (value.some((selection: SelectItem) => !selection || !(selection as Record<string, any>)[itemId])) return;
            value = value.map((selection) => findItem(selection) || selection);
        } else if (typeof value === 'object') {
            if (!(value as Record<string, any>)[itemId]) return;
            value = findItem() || value;
        }
    }

    function assignInputAttributes() {
        _inputAttributes = { ...DEFAULT_INPUT_ATTRS, ...inputAttributes };
        if (id) _inputAttributes['id'] = id;
        if (!searchable) _inputAttributes['readonly'] = true;
    }

    function convertStringItemsToObjects(_items: string[]): SelectItem[] {
        return _items.map((item, index) => {
            return {
                index,
                value: item,
                label: `${item}`,
            };
        });
    }

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

    function dispatchSelectedItem() {
        if (multiple) {
            if (hasValueChanged(value, prev_value)) {
                if (checkValueForDuplicates()) {
                    oninput?.(value || []);
                }
            }
            return;
        }

        if (!prev_value || hasValueChanged((value as SelectItem)[itemId], (prev_value as SelectItem)[itemId])) {
            oninput?.(value);
        }
    }

    function setupMulti() {
        if (value) {
            if (Array.isArray(value)) {
                value = [...value];
            } else {
                value = [value];
            }
        }
    }

    function setValueIndexAsHoverIndex() {
        if (!normalizedValue || Array.isArray(normalizedValue)) return;

        const singleValue: SelectItem = normalizedValue;

        const valueIndex = filteredItems.findIndex((i: SelectItem) => {
            return (i as Record<string, any>)[itemId] === (singleValue as Record<string, any>)[itemId];
        });

        checkHoverSelectable(valueIndex, true);
    }

    function checkHoverSelectable(startingIndex = 0, ignoreGroup?: boolean) {
        hoverItemIndex = startingIndex < 0 ? 0 : startingIndex;
        if (!ignoreGroup && groupBy && filteredItems[hoverItemIndex] && !filteredItems[hoverItemIndex].selectable) {
            setHoverIndex(1);
        }
    }

    function setupFilterText() {
        // When loadOptions is defined, the unified $effect handles everything
        // This function now only handles non-loadOptions cases
        if (loadOptions) {
            // loadOptions is handled by the unified $effect that watches filterText and loadOptionsDeps
            // Just ensure the list opens if there's filter text
            if (filterText.length > 0 && !listOpen) {
                listOpen = true;
            }
            return;
        }

        if (filterText.length === 0) return;

        // Non-loadOptions case: just open the list
        listOpen = true;

        if (multiple) {
            activeValue = undefined;
        }
    }

    function computeJustValue(): any {
        if (useJustValue && !value && !clearState) {  // Change back to value
            const typedItems = (items as SelectItem[]) || [];
            if (multiple) {
                value = typedItems.filter((item: SelectItem) =>
                    justValue.includes((item as Record<string, any>)[itemId])
                );
            } else {
                value = typedItems.filter((item: SelectItem) =>  // Change back to value
                    (item as Record<string, any>)[itemId] === justValue
                )[0];
            }
        }

        clearState = false;

        // Handle multiple selection
        if (multiple && Array.isArray(value)) {
            return value ? value.map((item: SelectItem) =>
                (item as Record<string, any>)[itemId]
            ) : null;
        }

        // Handle single selection
        if (!value || typeof value === 'string' || Array.isArray(value)) {
            return value;
        }

        return (value as Record<string, any>)[itemId];
    }

    function checkValueForDuplicates(): boolean {
        if (!Array.isArray(value) || value.length === 0) return true;

        const seen = new Set();
        const uniqueValues = value.filter((val: SelectItem) => {
            const id = val[itemId];
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        const noDuplicates = uniqueValues.length === value.length;
        if (!noDuplicates) value = uniqueValues;

        return noDuplicates;
    }

    function findItem(selection?: SelectItem): SelectItem | undefined {
        let matchTo = selection ? selection[itemId] : (normalizedValue as SelectItem)[itemId];
        return (items as SelectItem[])?.find(item => item[itemId] === matchTo);
    }

    async function handleMultiItemClear(i:number): Promise<void> {
        if (!Array.isArray(value)) return;

        const itemToRemove = value[i];

        clearState = true;
        if (value.length === 1) {
            value = undefined;
        } else {
            value = value.filter((item: SelectItem) => {
                return item !== itemToRemove;
            });
        }
        onclear(itemToRemove);
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

    function handleListScroll() {
        clearTimeout(isScrollingTimer);
        isScrollingTimer = setTimeout(() => {
            isScrolling = false;
        }, 100);
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
        itemSelected(item);
    }

    function handleHover(i: number): void {
        if (isScrolling) return;
        hoverItemIndex = i;
    }

    function handleItemClick(item: SelectItem, i: number): void {
        if (item?.selectable === false) return;
        if (!multiple && areItemsEqual(normalizedValue, item, itemId)) return closeList();
        if (isItemSelectable(item)) {
            hoverItemIndex = i;
            handleSelect(item);
        }
    }

    function setHoverIndex(increment: number) {
        let selectableFilteredItems = filteredItems.filter(
            (item) => !Object.hasOwn(item, 'selectable') || item.selectable === true,
        );

        if (selectableFilteredItems.length === 0) {
            return (hoverItemIndex = 0);
        }

        // Get current item
        const currentItem = filteredItems[hoverItemIndex];
        const isCurrentSelectable = isItemSelectableCheck(currentItem);

        // Find position in selectable items array
        let currentSelectableIndex;

        if (isCurrentSelectable) {
            currentSelectableIndex = selectableFilteredItems.findIndex(item => item === currentItem);
        } else {
            // Starting from non-selectable item - treat as before first/after last depending on direction
            currentSelectableIndex = increment > 0 ? -1 : selectableFilteredItems.length;
        }

        // Calculate new position with wrapping
        let newSelectableIndex;
        if (increment > 0) {
            newSelectableIndex = (currentSelectableIndex + 1) % selectableFilteredItems.length;
        } else {
            newSelectableIndex = (currentSelectableIndex - 1 + selectableFilteredItems.length) % selectableFilteredItems.length;
        }

        // Map back to filteredItems
        const newItem = selectableFilteredItems[newSelectableIndex];
        hoverItemIndex = filteredItems.findIndex(item => item === newItem);
    }

    function isItemActive(item: SelectItem, val: SelectItem | SelectItem[] | null | undefined, itemId: string): boolean | undefined {
        if (multiple) return;
        const normalized = !val ? null : typeof val === 'string' ? { value: val, label: val } : val;
        return areItemsEqual(normalized, item, itemId);
    }

    function isItemSelectable(item: SelectItem) {
        return (item.groupHeader && item.selectable) || isItemSelectableCheck(item);
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
            onscroll={handleListScroll}
            onpointerup={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
            }}
            onmousedown={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
            }}
            role="none">
            {#if listPrependSnippet}
                {@render listPrependSnippet()}
            {/if}
            {#if listSnippet}
                {@render listSnippet(filteredItems)}
            {:else if filteredItems?.length > 0}
                {#each filteredItems as item, i}
                    <div
                        onmouseover={() => handleHover(i)}
                        onfocus={() => handleHover(i)}
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
                        role="none">
                        <div
                            class="item"
                            class:list-group-title={item.groupHeader}
                            class:active={isItemActive(item, normalizedValue, itemId)}
                            class:first={i === 0}
                            class:hover={hoverItemIndex === i}
                            class:group-item={item.groupItem}
                            class:not-selectable={item?.selectable === false}>
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
                            return multiFullItemClearable ? handleMultiItemClear(i) : {};
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
                                    handleMultiItemClear(i);
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
                        {@render selectionSnippet(value)}
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
        {@render inputHiddenSnippet(value)}
    {:else}
        <input {name} type="hidden" value={useJustValue ? justValue : value ? JSON.stringify(value) : null} />
    {/if}

    {#if required && (!value || value.length === 0)}
        {#if requiredSnippet}
            {@render requiredSnippet(value)}
        {:else}
            <select class="required" required tabindex="-1" aria-hidden="true"></select>
        {/if}
    {/if}
</div>

<style>.svelte-select {
    /* deprecating camelCase custom props in favour of kebab-case for v5 */
    --borderRadius: var(--border-radius);
    --clearSelectColor: var(--clear-select-color);
    --clearSelectWidth: var(--clear-select-width);
    --disabledBackground: var(--disabled-background);
    --disabledBorderColor: var(--disabled-border-color);
    --disabledColor: var(--disabled-color);
    --disabledPlaceholderColor: var(--disabled-placeholder-color);
    --disabledPlaceholderOpacity: var(--disabled-placeholder-opacity);
    --errorBackground: var(--error-background);
    --errorBorder: var(--error-border);
    --groupItemPaddingLeft: var(--group-item-padding-left);
    --groupTitleColor: var(--group-title-color);
    --groupTitleFontSize: var(--group-title-font-size);
    --groupTitleFontWeight: var(--group-title-font-weight);
    --groupTitlePadding: var(--group-title-padding);
    --groupTitleTextTransform: var(--group-title-text-transform);
    --groupTitleBorderColor: var(--group-title-border-color);
    --groupTitleBorderWidth: var(--group-title-border-width);
    --groupTitleBorderStyle: var(--group-title-border-style);
    --indicatorColor: var(--chevron-color);
    --indicatorHeight: var(--chevron-height);
    --indicatorWidth: var(--chevron-width);
    --inputColor: var(--input-color);
    --inputLeft: var(--input-left);
    --inputLetterSpacing: var(--input-letter-spacing);
    --inputMargin: var(--input-margin);
    --inputPadding: var(--input-padding);
    --itemActiveBackground: var(--item-active-background);
    --itemColor: var(--item-color);
    --itemFirstBorderRadius: var(--item-first-border-radius);
    --itemHoverBG: var(--item-hover-bg);
    --itemHoverColor: var(--item-hover-color);
    --itemIsActiveBG: var(--item-is-active-bg);
    --itemIsActiveColor: var(--item-is-active-color);
    --itemIsNotSelectableColor: var(--item-is-not-selectable-color);
    --itemPadding: var(--item-padding);
    --listBackground: var(--list-background);
    --listBorder: var(--list-border);
    --listBorderRadius: var(--list-border-radius);
    --listEmptyColor: var(--list-empty-color);
    --listEmptyPadding: var(--list-empty-padding);
    --listEmptyTextAlign: var(--list-empty-text-align);
    --listMaxHeight: var(--list-max-height);
    --listPosition: var(--list-position);
    --listShadow: var(--list-shadow);
    --listZIndex: var(--list-z-index);
    --multiItemBG: var(--multi-item-bg);
    --multiItemBorderRadius: var(--multi-item-border-radius);
    --multiItemDisabledHoverBg: var(--multi-item-disabled-hover-bg);
    --multiItemDisabledHoverColor: var(--multi-item-disabled-hover-color);
    --multiItemHeight: var(--multi-item-height);
    --multiItemMargin: var(--multi-item-margin);
    --multiItemPadding: var(--multi-item-padding);
    --multiSelectInputMargin: var(--multi-select-input-margin);
    --multiSelectInputPadding: var(--multi-select-input-padding);
    --multiSelectPadding: var(--multi-select-padding);
    --placeholderColor: var(--placeholder-color);
    --placeholderOpacity: var(--placeholder-opacity);
    --selectedItemPadding: var(--selected-item-padding);
    --spinnerColor: var(--spinner-color);
    --spinnerHeight: var(--spinner-height);
    --spinnerWidth: var(--spinner-width);

    --internal-padding: 0 0 0 16px;

    border: var(--border, 1px solid #d8dbdf);
    border-radius: var(--border-radius, 6px);
    min-height: var(--height, 42px);
    position: relative;
    display: flex;
    align-items: stretch;
    padding: var(--padding, var(--internal-padding));
    background: var(--background, #fff);
    margin: var(--margin, 0);
    width: var(--width, 100%);
    font-size: var(--font-size, 16px);
    max-height: var(--max-height);
}

* {
    box-sizing: var(--box-sizing, border-box);
}

.svelte-select:hover {
    border: var(--border-hover, 1px solid #b2b8bf);
}

.value-container {
    display: flex;
    flex: 1 1 0%;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px 10px;
    padding: var(--value-container-padding, 5px 0);
    position: relative;
    overflow: var(--value-container-overflow, hidden);
    align-self: stretch;
}

.prepend,
.indicators {
    display: flex;
    flex-shrink: 0;
    align-items: center;
}

.indicators {
    position: var(--indicators-position);
    top: var(--indicators-top);
    right: var(--indicators-right);
    bottom: var(--indicators-bottom);
}

input {
    position: absolute;
    cursor: default;
    border: none;
    color: var(--input-color, var(--item-color));
    padding: var(--input-padding, 0);
    letter-spacing: var(--input-letter-spacing, inherit);
    margin: var(--input-margin, 0);
    min-width: 10px;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: transparent;
    font-size: var(--font-size, 16px);
}

:not(.multi) > .value-container > input {
    width: 100%;
    height: 100%;
}

input::placeholder {
    color: var(--placeholder-color, #78848f);
    opacity: var(--placeholder-opacity, 1);
}

input:focus {
    outline: none;
}

.svelte-select.focused {
    border: var(--border-focused, 1px solid #006fe8);
    border-radius: var(--border-radius-focused, var(--border-radius, 6px));
}

.disabled {
    background: var(--disabled-background, #ebedef);
    border-color: var(--disabled-border-color, #ebedef);
    color: var(--disabled-color, #c1c6cc);
}

.disabled input::placeholder {
    color: var(--disabled-placeholder-color, #c1c6cc);
    opacity: var(--disabled-placeholder-opacity, 1);
}

.selected-item {
    position: relative;
    overflow: var(--selected-item-overflow, hidden);
    padding: var(--selected-item-padding, 0 20px 0 0);
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--selected-item-color, inherit);
    font-size: var(--font-size, 16px);
}

.multi .selected-item {
    position: absolute;
    line-height: var(--height, 42px);
    height: var(--height, 42px);
}

.selected-item:focus {
    outline: none;
}

.hide-selected-item {
    opacity: 0;
}

.icon {
    display: flex;
    align-items: center;
    justify-content: center;
}

.clear-select {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--clear-select-width, 40px);
    height: var(--clear-select-height, 100%);
    color: var(--clear-select-color, var(--icons-color));
    margin: var(--clear-select-margin, 0);
    pointer-events: all;
    flex-shrink: 0;
}

.clear-select:focus {
    outline: var(--clear-select-focus-outline, 1px solid #006fe8);
}

.loading {
    width: var(--loading-width, 40px);
    height: var(--loading-height);
    color: var(--loading-color, var(--icons-color));
    margin: var(--loading--margin, 0);
    flex-shrink: 0;
}

.chevron {
    width: var(--chevron-width, 40px);
    height: var(--chevron-height, 40px);
    background: var(--chevron-background, transparent);
    pointer-events: var(--chevron-pointer-events, none);
    color: var(--chevron-color, var(--icons-color));
    border: 0;
    border-left: var(--chevron-border-left, 1px solid #d8dbdf);
    flex-shrink: 0;
}

.multi {
    padding: var(--multi-select-padding, var(--internal-padding));
}

.multi input {
    padding: var(--multi-select-input-padding, 0);
    position: relative;
    margin: var(--multi-select-input-margin, 5px 0);
    flex: 1 1 40px;
}

.svelte-select.error {
    border: var(--error-border, 1px solid #ff2d55);
    background: var(--error-background, #fff);
}

.a11y-text {
    z-index: 9999;
    border: 0px;
    clip: rect(1px, 1px, 1px, 1px);
    height: 1px;
    width: 1px;
    position: absolute;
    overflow: hidden;
    padding: 0px;
    white-space: nowrap;
}

.multi-item {
    background: var(--multi-item-bg, #ebedef);
    margin: var(--multi-item-margin, 0);
    outline: var(--multi-item-outline, 1px solid #ddd);
    border-radius: var(--multi-item-border-radius, 4px);
    height: var(--multi-item-height, 25px);
    line-height: var(--multi-item-height, 25px);
    display: flex;
    cursor: default;
    padding: var(--multi-item-padding, 0 5px);
    overflow: hidden;
    gap: var(--multi-item-gap, 4px);
    outline-offset: -1px;
    max-width: var(--multi-max-width, none);
    color: var(--multi-item-color, var(--item-color));
}

.multi-item.disabled:hover {
    background: var(--multi-item-disabled-hover-bg, #ebedef);
    color: var(--multi-item-disabled-hover-color, #c1c6cc);
}

.multi-item-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.multi-item-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    --clear-icon-color: var(--multi-item-clear-icon-color, #000);
}

.multi-item.active {
    outline: var(--multi-item-active-outline, 1px solid #006fe8);
}

.svelte-select-list {
    box-shadow: var(--list-shadow, 0 2px 3px 0 rgba(44, 62, 80, 0.24));
    border-radius: var(--list-border-radius, 4px);
    max-height: var(--list-max-height, 252px);
    overflow-y: auto;
    background: var(--list-background, #fff);
    position: var(--list-position, absolute);
    z-index: var(--list-z-index, 2);
    border: var(--list-border);
}

.prefloat {
    opacity: 0;
    pointer-events: none;
}

.list-group-title {
    color: var(--group-title-color, #000000);
    cursor: default;
    font-size: var(--group-title-font-size, 16px);
    font-weight: var(--group-title-font-weight, 600);
    height: var(--height, 42px);
    line-height: var(--height, 42px);
    padding: var(--group-title-padding, 0 20px);
    text-overflow: ellipsis;
    overflow-x: hidden;
    white-space: nowrap;
    text-transform: var(--group-title-text-transform, uppercase);
    border-width: var(--group-title-border-width, medium);
    border-style: var(--group-title-border-style, none);
    border-color: var(--group-title-border-color, transparent);
}

.empty {
    text-align: var(--list-empty-text-align, center);
    padding: var(--list-empty-padding, 20px 0);
    color: var(--list-empty-color, #78848f);
}

.item {
    cursor: default;
    height: var(--item-height, var(--height, 42px));
    line-height: var(--item-line-height, var(--height, 42px));
    padding: var(--item-padding, 0 20px);
    color: var(--item-color, inherit);
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    transition: var(--item-transition, all 0.2s);
    align-items: center;
    width: 100%;
}

.item.group-item {
    padding-left: var(--group-item-padding-left, 40px);
}

.item:active {
    background: var(--item-active-background, #b9daff);
}

.item.active {
    background: var(--item-is-active-bg, #007aff);
    color: var(--item-is-active-color, #fff);
}

.item.first {
    border-radius: var(--item-first-border-radius, 4px 4px 0 0);
}

.item.hover:not(.active) {
    background: var(--item-hover-bg, #e7f2ff);
    color: var(--item-hover-color, inherit);
}

.item.not-selectable,
.item.hover.item.not-selectable,
.item.active.item.not-selectable,
.item.not-selectable:active {
    color: var(--item-is-not-selectable-color, #999);
    background: transparent;
}

.required {
    opacity: 0;
    z-index: -1;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
}
</style>