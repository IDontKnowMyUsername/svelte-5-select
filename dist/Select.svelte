<script>
    import { onDestroy, onMount } from 'svelte';
    import { offset, flip, shift } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';

    import _filter from './filter';
    import _getItems from './get-items';

    import ChevronIcon from './ChevronIcon.svelte';
    import ClearIcon from './ClearIcon.svelte';
    import LoadingIcon from './LoadingIcon.svelte';

    let {
        prependSnippet,
        listSnippet,
        listAppendSnippet,
        listPrependSnippet,
        loadingIconSnippet,
        itemSnippet,
        selectionSnippet,
        emptySnippet,
        clearIconSnippet,
        multiClearIconSnippet,
        chevronIconSnippet,
        inputHiddenSnippet,
        requiredSnippet,
        justValue = null,
        useJustValue = false,
        filter = _filter,
        getItems = _getItems,
        id = null,
        name = null,
        container = undefined,
        input = undefined,
        multiple = false,
        multiFullItemClearable = false,
        disabled = false,
        focused = false,
        value = null,
        filterText = '',
        placeholder = 'Please select',
        placeholderAlwaysShow = false,
        items = null,
        label = 'label',
        itemFilter = (label, filterText, option) => `${label}`.toLowerCase().includes(filterText.toLowerCase()),
        groupBy = undefined,
        groupFilter = (groups) => groups,
        groupHeaderSelectable = false,
        itemId = 'value',
        loadOptions = undefined,
        containerStyles = '',
        hasError = false,
        filterSelectedItems = true,
        required = false,
        closeListOnChange = true,
        clearFilterTextOnBlur = true,
        createGroupHeaderItem = (groupValue, item) => {
            return {
                value: groupValue,
                [label]: groupValue,
            };
        },
        getFilteredItems = () => {
            return filteredItems;
        },
        searchable = true,
        inputStyles = '',
        clearable = true,
        loading = false,
        listOpen = false,
        debounceWait = 300,
        hideEmptyState = false,
        inputAttributes = {},
        listAutoWidth = true,
        showChevron = false,
        listOffset = 5,
        hoverItemIndex = 0,
        floatingConfig = {},
        debounce = (fn, wait = 1) => {
            clearTimeout(timeout);
            timeout = setTimeout(fn, wait);
        },
        ariaValues = (values) => {
            return `Option ${values}, selected.`;
        },
        ariaListOpen = (label, count) => {
            return `You are currently focused on option ${label}. There are ${count} results available.`;
        },
        ariaFocused = () => {
            return `Select is focused, type to refine list, press down to open the menu.`;
        },
        handleClear = () => {
            onClear(value);
            value = undefined;
            closeList();
            handleFocus();
        },
        onInput,
        onFilter,
        onClear,
        onFocus,
        onChange,
        onSelect,
        onBlur,
        onHoverItem,
        ...rest
    } = $props();

    let timeout = $state();
    let _inputAttributes = $state();
    let activeValue = $state();
    let prev_value = $state();
    let prev_filterText = $state();
    let prev_multiple = $state();
    let list = $state(null);
    let isScrollingTimer = $state();
    let isScrolling = $state(false);
    let prefloat = $state(true);
    let hasValue = $state(false);
    let placeholderText = $state('');
    let showClear = $state(false);
    let hideSelectedItem = $state(false);
    let ariaSelection = $state('');
    let filteredItems = $state([]);
    let ariaContext = $state('');
    let listDom = $state(false);
    let scrollToHoverItem = $state(0);
    let _floatingConfig = $state({
        strategy: 'absolute',
        placement: 'bottom-start',
        middleware: [offset(listOffset), flip(), shift()],
        autoUpdate: false,
    });

    onMount(() => {
        if (listOpen) focused = true;
        if (focused && input) input.focus();
    });

    function setValue() {
        if (typeof value === 'string') {
            let item = (items || []).find((item) => item[itemId] === value);
            value = item || {
                [itemId]: value,
                label: value,
            };
        } else if (multiple && Array.isArray(value) && value.length > 0) {
            value = value.map((item) => (typeof item === 'string' ? { value: item, label: item } : item));
        }
    }

    function assignInputAttributes() {
        _inputAttributes = Object.assign(
            {
                autocapitalize: 'none',
                autocomplete: 'off',
                autocorrect: 'off',
                spellcheck: false,
                tabindex: 0,
                type: 'text',
                'aria-autocomplete': 'list',
            },
            inputAttributes,
        );

        if (id) {
            _inputAttributes['id'] = id;
        }

        if (!searchable) {
            _inputAttributes['readonly'] = true;
        }
    }

    function convertStringItemsToObjects(_items) {
        return _items.map((item, index) => {
            return {
                index,
                value: item,
                label: `${item}`,
            };
        });
    }

    function filterGroupedItems(_items) {
        const groupValues = [];
        const groups = {};

        _items.forEach((item) => {
            const groupValue = groupBy(item);

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

        const sortedGroupedItems = [];

        groupFilter(groupValues).forEach((groupValue) => {
            if (groups[groupValue]) sortedGroupedItems.push(...groups[groupValue]);
        });

        return sortedGroupedItems;
    }

    function dispatchSelectedItem() {
        if (multiple) {
            if (JSON.stringify(value) !== JSON.stringify(prev_value)) {
                if (checkValueForDuplicates()) {
                    onInput(value);
                }
            }
            return;
        }

        if (!prev_value || JSON.stringify(value[itemId]) !== JSON.stringify(prev_value[itemId])) {
            onInput(value);
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

    function setupSingle() {
        if (value) value = null;
    }

    $effect(() => {
        if ((items, value)) setValue();
    });
    $effect(() => {
        if (inputAttributes || !searchable) assignInputAttributes();
    });
    $effect(() => {
        if (multiple) setupMulti();
    });
    $effect(() => {
        if (prev_multiple && !multiple) setupSingle();
    });
    $effect(() => {
        if (multiple && value && value.length > 1) checkValueForDuplicates();
    });
    $effect(() => {
        if (value) dispatchSelectedItem();
    });
    $effect(() => {
        if (!value && multiple && prev_value) {
            onInput(value);
        }
    });
    $effect(() => {
        if (!focused && input) closeList();
    });
    $effect(() => {
        if (filterText !== prev_filterText) setupFilterText();
    });
    $effect(() => {
        if (!multiple && listOpen && value && filteredItems) setValueIndexAsHoverIndex();
    });
    $effect(() => {
        dispatchHover(hoverItemIndex);
    });

    function setValueIndexAsHoverIndex() {
        const valueIndex = filteredItems.findIndex((i) => {
            return i[itemId] === value[itemId];
        });

        checkHoverSelectable(valueIndex, true);
    }

    function dispatchHover(i) {
        onHoverItem(i);
    }

    function checkHoverSelectable(startingIndex = 0, ignoreGroup) {
        hoverItemIndex = startingIndex < 0 ? 0 : startingIndex;
        if (!ignoreGroup && groupBy && filteredItems[hoverItemIndex] && !filteredItems[hoverItemIndex].selectable) {
            setHoverIndex(1);
        }
    }

    function setupFilterText() {
        if (!loadOptions && filterText.length === 0) return;

        if (loadOptions) {
            debounce(async function () {
                loading = true;
                let res = await getItems({
                    loadOptions,
                    convertStringItemsToObjects,
                    filterText,
                });

                if (res) {
                    loading = res.loading;
                    listOpen = listOpen ? res.listOpen : filterText.length > 0 ? true : false;
                    focused = listOpen && res.focused;
                    items = groupBy ? filterGroupedItems(res.filteredItems) : res.filteredItems;
                } else {
                    loading = false;
                    focused = true;
                    listOpen = true;
                }
            }, debounceWait);
        } else {
            listOpen = true;

            if (multiple) {
                activeValue = undefined;
            }
        }
    }

    $effect(() => {
        hasValue = multiple ? value && value.length > 0 : value;
    });
    $effect(() => {
        hideSelectedItem = hasValue && filterText.length > 0;
    });
    $effect(() => {
        showClear = hasValue && clearable && !disabled && !loading;
    });
    $effect(() => {
        placeholderText =
            placeholderAlwaysShow && multiple
                ? placeholder
                : multiple && value?.length === 0
                  ? placeholder
                  : value
                    ? ''
                    : placeholder;
    });
    $effect(() => {
        ariaSelection = value ? handleAriaSelection(multiple) : '';
    });
    $effect(() => {
        ariaContext = handleAriaContent({ filteredItems, hoverItemIndex, focused, listOpen });
    });
    $effect(() => {
        updateValueDisplay(items);
    });
    $effect(() => {
        justValue = computeJustValue(multiple, value, itemId);
    });
    $effect(() => {
        if (!multiple && prev_value && !value) {
            onInput(value);
        }
    });
    $effect(() => {
        filteredItems = filter({
            loadOptions,
            filterText,
            items,
            multiple,
            value,
            itemId,
            groupBy,
            label,
            filterSelectedItems,
            itemFilter,
            convertStringItemsToObjects,
            filterGroupedItems,
        });
    });
    $effect(() => {
        if (listOpen && filteredItems && !multiple && !value) checkHoverSelectable();
    });
    $effect(() => {
        handleFilterEvent(filteredItems);
    });
    $effect(() => {
        if (container && floatingConfig) floatingUpdate(Object.assign(_floatingConfig, floatingConfig));
    });
    $effect(() => {
        listDom = !!list;
    });
    $effect(() => {
        listMounted(list, listOpen);
    });
    $effect(() => {
        if (listOpen && container && list) setListWidth();
    });
    $effect(() => {
        scrollToHoverItem = hoverItemIndex;
    });
    $effect(() => {
        if (listOpen && multiple) hoverItemIndex = 0;
    });
    $effect(() => {
        if (input && listOpen && !focused) handleFocus();
    });
    $effect(() => {
        if (filterText) hoverItemIndex = 0;
    });

    function handleFilterEvent(items) {
        if (listOpen) {
            onFilter(items);
        }
    }

    $effect.pre(async () => {
        prev_value = value;
        prev_filterText = filterText;
        prev_multiple = multiple;
    });

    function computeJustValue() {
        if (multiple) return value ? value.map((item) => item[itemId]) : null;
        return value ? value[itemId] : value;
    }

    function checkValueForDuplicates() {
        let noDuplicates = true;
        if (value) {
            const ids = [];
            const uniqueValues = [];

            value.forEach((val) => {
                if (!ids.includes(val[itemId])) {
                    ids.push(val[itemId]);
                    uniqueValues.push(val);
                } else {
                    noDuplicates = false;
                }
            });

            if (!noDuplicates) value = uniqueValues;
        }
        return noDuplicates;
    }

    function findItem(selection) {
        let matchTo = selection ? selection[itemId] : value[itemId];
        return items.find((item) => item[itemId] === matchTo);
    }

    function updateValueDisplay(items) {
        if (!items || items.length === 0 || items.some((item) => typeof item !== 'object')) return;
        if (!value || (multiple ? value.some((selection) => !selection || !selection[itemId]) : !value[itemId])) return;

        if (Array.isArray(value)) {
            value = value.map((selection) => findItem(selection) || selection);
        } else {
            value = findItem() || value;
        }
    }

    async function handleMultiItemClear(i) {
        const itemToRemove = value[i];

        if (value.length === 1) {
            value = undefined;
        } else {
            value = value.filter((item) => {
                return item !== itemToRemove;
            });
        }
        onClear(itemToRemove);
    }

    function handleKeyDown(e) {
        if (!focused) return;
        e.stopPropagation();
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                closeList();
                break;
            case 'Enter':
                e.preventDefault();

                if (listOpen) {
                    if (filteredItems.length === 0) break;
                    const hoverItem = filteredItems[hoverItemIndex];

                    if (value && !multiple && value[itemId] === hoverItem[itemId]) {
                        closeList();
                        break;
                    } else {
                        handleSelect(filteredItems[hoverItemIndex]);
                    }
                }

                break;
            case 'ArrowDown':
                e.preventDefault();

                if (listOpen) {
                    setHoverIndex(1);
                } else {
                    listOpen = true;
                    activeValue = undefined;
                }

                break;
            case 'ArrowUp':
                e.preventDefault();

                if (listOpen) {
                    setHoverIndex(-1);
                } else {
                    listOpen = true;
                    activeValue = undefined;
                }

                break;
            case 'Tab':
                if (listOpen && focused) {
                    if (
                        filteredItems.length === 0 ||
                        (value && value[itemId] === filteredItems[hoverItemIndex][itemId])
                    )
                        return closeList();

                    e.preventDefault();
                    handleSelect(filteredItems[hoverItemIndex]);
                    closeList();
                }

                break;
            case 'Backspace':
                if (!multiple || filterText.length > 0) return;

                if (multiple && value && value.length > 0) {
                    handleMultiItemClear(activeValue !== undefined ? activeValue : value.length - 1);
                    if (activeValue === 0 || activeValue === undefined) break;
                    activeValue = value.length > activeValue ? activeValue - 1 : undefined;
                }

                break;
            case 'ArrowLeft':
                if (!value || !multiple || filterText.length > 0) return;
                if (activeValue === undefined) {
                    activeValue = value.length - 1;
                } else if (value.length > activeValue && activeValue !== 0) {
                    activeValue -= 1;
                }
                break;
            case 'ArrowRight':
                if (!value || !multiple || filterText.length > 0 || activeValue === undefined) return;
                if (activeValue === value.length - 1) {
                    activeValue = undefined;
                } else if (activeValue < value.length - 1) {
                    activeValue += 1;
                }
                break;
        }
    }

    function handleFocus(e) {
        if (focused && input === document?.activeElement) return;
        if (e) {
            onFocus(e);
        }
        input?.focus();
        focused = true;
    }

    async function handleBlur(e) {
        if (isScrolling) return;
        if (listOpen || focused) {
            onBlur(e);
            closeList();
            focused = false;
            activeValue = undefined;
            input?.blur();
        }
    }

    function handleClick(ev) {
        ev.preventDefault();
        if (disabled) return;
        if (filterText.length > 0) return (listOpen = true);
        listOpen = !listOpen;
    }

    function itemSelected(selection) {
        if (selection) {
            filterText = '';
            const item = Object.assign({}, selection);

            if (item.groupHeader && !item.selectable) return;
            value = multiple ? (value ? value.concat([item]) : [item]) : (value = item);

            setTimeout(() => {
                if (closeListOnChange) closeList();
                activeValue = undefined;
                onChange(value);
                onSelect(selection);
            });
        }
    }

    function closeList() {
        if (clearFilterTextOnBlur) {
            filterText = '';
        }
        listOpen = false;
    }

    function handleAriaSelection(_multiple) {
        let selected = undefined;

        if (_multiple && value.length > 0) {
            selected = value.map((v) => v[label]).join(', ');
        } else {
            selected = value[label];
        }

        return ariaValues(selected);
    }

    function handleAriaContent() {
        if (!filteredItems || filteredItems.length === 0) return '';
        let _item = filteredItems[hoverItemIndex];
        if (listOpen && _item) {
            let count = filteredItems ? filteredItems.length : 0;
            return ariaListOpen(_item[label], count);
        } else {
            return ariaFocused();
        }
    }

    function handleListScroll() {
        clearTimeout(isScrollingTimer);
        isScrollingTimer = setTimeout(() => {
            isScrolling = false;
        }, 100);
    }

    function handleClickOutside(event) {
        if (!listOpen && !focused && container && !container.contains(event.target) && !list?.contains(event.target)) {
            handleBlur();
        }
    }

    onDestroy(() => {
        list?.remove();
    });

    function handleSelect(item) {
        if (!item || item.selectable === false) return;
        itemSelected(item);
    }

    function handleHover(i) {
        if (isScrolling) return;
        hoverItemIndex = i;
    }

    function handleItemClick(args) {
        const { item, i } = args;
        if (item?.selectable === false) return;
        if (value && !multiple && value[itemId] === item[itemId]) return closeList();
        if (isItemSelectable(item)) {
            hoverItemIndex = i;
            handleSelect(item);
        }
    }

    function setHoverIndex(increment) {
        let selectableFilteredItems = filteredItems.filter(
            (item) => !Object.hasOwn(item, 'selectable') || item.selectable === true,
        );

        if (selectableFilteredItems.length === 0) {
            return (hoverItemIndex = 0);
        }

        if (increment > 0 && hoverItemIndex === filteredItems.length - 1) {
            hoverItemIndex = 0;
        } else if (increment < 0 && hoverItemIndex === 0) {
            hoverItemIndex = filteredItems.length - 1;
        } else {
            hoverItemIndex = hoverItemIndex + increment;
        }

        const hover = filteredItems[hoverItemIndex];

        if (hover && hover.selectable === false) {
            if (increment === 1 || increment === -1) setHoverIndex(increment);
            return;
        }
    }

    function isItemActive(item, value, itemId) {
        if (multiple) return;
        return value && value[itemId] === item[itemId];
    }

    function isItemFirst(itemIndex) {
        return itemIndex === 0;
    }

    function isItemSelectable(item) {
        return (item.groupHeader && item.selectable) || item.selectable || !item.hasOwnProperty('selectable');
    }

    const activeScroll = scrollAction;
    const hoverScroll = scrollAction;

    function scrollAction(node) {
        return {
            update(args) {
                if (args.scroll) {
                    handleListScroll();
                    node.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                }
            },
        };
    }

    function setListWidth() {
        const { width } = container.getBoundingClientRect();
        list.style.width = listAutoWidth ? width + 'px' : 'auto';
    }

    const [floatingRef, floatingContent, floatingUpdate] = createFloatingActions(_floatingConfig);

    $effect(() => {
        if (container && floatingConfig?.autoUpdate === undefined) {
            _floatingConfig.autoUpdate = true;
        }
    });

    function listMounted(list, listOpen) {
        if (!list || !listOpen) return (prefloat = true);
        setTimeout(() => {
            prefloat = false;
        }, 0);
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
            {:else if filteredItems.length > 0}
                {#each filteredItems as item, i}
                    <div
                        onmouseover={() => handleHover(i)}
                        onfocus={() => handleHover(i)}
                        onclick={(ev) => {
                            ev.stopPropagation();
                            handleItemClick({ item, i });
                        }}
                        onkeydown={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                        }}
                        class="list-item"
                        tabindex="-1"
                        role="none">
                        <div
                            use:activeScroll={{ scroll: isItemActive(item, value, itemId), listDom }}
                            use:hoverScroll={{ scroll: scrollToHoverItem === i, listDom }}
                            class="item"
                            class:list-group-title={item.groupHeader}
                            class:active={isItemActive(item, value, itemId)}
                            class:first={isItemFirst(i)}
                            class:hover={hoverItemIndex === i}
                            class:group-item={item.groupItem}
                            class:not-selectable={item?.selectable === false}>
                            {#if itemSnippet}
                                {@render itemSnippet(item, index)}
                            {:else}
                                {item?.[label]}
                            {/if}
                        </div>
                    </div>
                {/each}
            {:else if !hideEmptyState}
                {#if emptySnippet}
                    {@render emptySnippet()}
                {:else}
                    <div class="empty">No options</div>
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
                {#each value as item, i}
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
                                {@render selectionSnippet(value, index)}
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
                        {value[label]}
                    {/if}
                </div>
            {/if}
        {/if}

        <input
            onkeydown={handleKeyDown}
            onblur={handleBlur}
            onfocus={handleFocus}
            readOnly={!searchable}
            {..._inputAttributes}
            bind:this={input}
            bind:value={filterText}
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

<style>
    .svelte-select {
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
        border: var(--chevron-border, 0 0 0 1px solid #d8dbdf);
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
        color: var(--group-title-color, #000);
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
        border-color: var(--group-title-border-color, color);
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
