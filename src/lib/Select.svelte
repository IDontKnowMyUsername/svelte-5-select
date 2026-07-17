<svelte:options runes={true} />

<!--
@component
A select/autocomplete/typeahead control: a WAI-ARIA combobox with a floating
listbox popup. Generic over your item type; supports multi-select, async
loading (`loadOptions`), grouping (`groupBy`), and snippet-based customization.
Bind `value` (and optionally `justValue`, `filterText`, `listOpen`, `focused`).
-->

<script lang="ts" generics="Item extends ItemLike = SelectItem, Multiple extends boolean = false">
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import { DEV } from 'esm-env';
    import { offset, flip, shift } from 'svelte-floating-ui/dom';
    import type {
        FloatingConfig,
        ItemLike,
        SelectProps,
        SelectRow,
        SelectValue,
        SelectClearValue,
        SelectErrorEvent,
    } from './types';
    import { createFloatingActions } from 'svelte-floating-ui';
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
        multiple = false as Multiple,
        required = false,
        searchable = true,
        useJustValue = false,

        // Styling props
        containerStyles = '',
        inputStyles = '',
        listStyles = '',
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
        ariaErrorMessage = undefined,
        ariaClearSelectLabel = 'Clear selection',
        ariaRemoveItemLabel = (label: string) => `Remove ${label}`,
        ariaCleared = () => {
            return `Selection cleared.`;
        },
        ariaEmpty = () => {
            return `No options`;
        },
        ariaFocused = () => {
            // In select-only mode (searchable={false}) the input is readonly, so
            // "type to refine" would instruct an action that does nothing
            return searchable
                ? `Select is focused, type to refine list, press down to open the menu.`
                : `Select is focused, press down to open the menu.`;
        },
        ariaListOpen = (label: string, count: number) => {
            return `You are currently focused on option ${label}. There are ${count} results available.`;
        },
        ariaLoading = () => {
            return `Loading Data`;
        },
        ariaValues = (values: string) => {
            return `Option ${values}, selected.`;
        },

        // Custom behavior
        handleClear = internalHandleClear,

        // Event handlers
        onblur = () => {},
        onclear = () => {},
        onerror = defaultOnError,
        onfilter = () => {},
        onfocus = () => {},
        onhoveritem = () => {},
        onloaded = defaultOnLoaded,
        onselect = () => {},
        onSelectionChange = () => {},
        onValueChange = () => {},

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
    }: SelectProps<Item, Multiple> = $props();

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
        get ariaEmpty() {
            return ariaEmpty;
        },
        get ariaLoading() {
            return ariaLoading;
        },
    });

    function internalHandleClear(_e?: MouseEvent): void {
        selectState.clearState = true;
        onclear(value as unknown as SelectClearValue<Item, Multiple>);
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
            applyGrouping,
        }),
    );

    // Fold the flat filteredItems (header, item, item, header, …) into real
    // listbox groups so each group can carry role="group" named by its header.
    // Flat indices are preserved on every entry so ids, aria-activedescendant
    // and hover keep working. Without groupBy every row is a plain option and
    // the list renders flat exactly as before.
    type GroupRow =
        | { type: 'option'; item: SelectItem; index: number }
        | { type: 'group'; headerIndex: number; header: SelectItem; options: { item: SelectItem; index: number }[] };

    let groupedRows = $derived.by<GroupRow[]>(() => {
        const rows: GroupRow[] = [];
        let current: Extract<GroupRow, { type: 'group' }> | null = null;
        filteredItems.forEach((item, index) => {
            if (item.groupHeader) {
                current = { type: 'group', headerIndex: index, header: item, options: [] };
                rows.push(current);
            } else if (item.groupItem && current) {
                current.options.push({ item, index });
            } else {
                current = null;
                rows.push({ type: 'option', item, index });
            }
        });
        return rows;
    });
    // The option the combobox currently points at. With a custom listSnippet the
    // consumer owns option rendering, so this only resolves if they honour the
    // documented id contract — a dev-only effect below warns when it dangles.
    let _activeDescendantId = $derived(
        listOpen && filteredItems[hoverItemIndex] && !isPresentationalHeader(filteredItems[hoverItemIndex])
            ? `listbox-${_id}-item-${hoverItemIndex}`
            : undefined,
    );
    let _inputAttributes = $derived.by<HTMLInputAttributes>(() => {
        const attrs: HTMLInputAttributes = {
            ...DEFAULT_INPUT_ATTRS,
            // The APG select-only pattern has no autocomplete behavior: with
            // searchable={false} the input is readonly and typing never refines
            // the list, so advertising list-autocomplete would misinform AT
            'aria-autocomplete': searchable ? ('list' as const) : undefined,
            // The selection renders in a sibling div, so the combobox's own
            // accessible value is the (empty) filter text; describe the element
            // holding the selection so browse-mode users can read it from the
            // input itself. Multiple mode is excluded: each chip is separately
            // focusable and announced, and the description would also read
            // every remove-button label.
            'aria-describedby': !multiple && value ? `selected-${_id}` : undefined,
            role: 'combobox',
            'aria-controls': listOpen ? `listbox-${_id}` : undefined,
            'aria-expanded': listOpen,
            'aria-haspopup': 'listbox',
            'aria-activedescendant': _activeDescendantId,
            // Only an explicit ariaLabel: a default aria-label would override an external
            // <label for={id}> in accessible-name computation. Without either, the
            // placeholder still names the input as the spec's last-resort fallback.
            'aria-label': ariaLabel,
            'aria-required': required || undefined,
            'aria-invalid': hasError || undefined,
            // aria-errormessage is only meaningful alongside aria-invalid="true"
            'aria-errormessage': hasError && ariaErrorMessage ? ariaErrorMessage : undefined,
            readonly: !searchable,
            id: id ? id : undefined,
            ...inputAttributes,
            // Disabled is expressed with aria-disabled + readonly rather than the native
            // `disabled` attribute so the current value stays in the accessibility tree
            // and screen readers can still announce it. Spread last (after
            // inputAttributes) so a disabled control is never left interactive or
            // tab-reachable; interaction is blocked by the `disabled` guards in
            // handleClick/handleFocus/handleItemClick and the disabled effect, which
            // also force-closes a programmatically opened list.
            ...(disabled ? { 'aria-disabled': true, readonly: true, tabindex: -1 } : {}),
        };
        // A consumer handler in inputAttributes must add to the input's own
        // oninput/onblur/onfocus/onkeydown, not replace them: these attributes
        // are spread after the template's handlers (later-spread-wins), which
        // would otherwise silently disable filtering, focus handling, and
        // keyboard navigation. Composed order: the component's handler first,
        // then the consumer's.
        const internalHandlers = {
            oninput: handleInput,
            onblur: handleBlur,
            onfocus: handleFocus,
            onkeydown: handleKeyDown,
        };
        for (const key of Object.keys(internalHandlers) as (keyof typeof internalHandlers)[]) {
            const consumer = inputAttributes?.[key];
            if (typeof consumer !== 'function') continue;
            const internal = internalHandlers[key] as (e: Event) => unknown;
            (attrs as Record<string, unknown>)[key] = (e: Event) => {
                internal(e);
                (consumer as (e: Event) => unknown)(e);
            };
        }
        return attrs;
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

    /**
     * Instance export — call via a `bind:this` reference: returns the currently
     * rendered rows. They include any group headers synthesized by `groupBy`
     * (hence `SelectRow` rather than `Item`); narrow with `isGroupHeader`.
     */
    export function getFilteredItems(): SelectRow<Item>[] {
        return filteredItems as SelectRow<Item>[];
    }

    // Announce a cleared selection explicitly: the live region uses
    // aria-relevant="additions text", so merely emptying the selection span
    // announces nothing.
    let selectionCleared = $state(false);
    let prevHadValue = false; // seeded by the first effect run below
    $effect(() => {
        hasValue;
        focused;
        untrack(() => {
            if (!focused || hasValue) {
                selectionCleared = false;
            } else if (prevHadValue) {
                selectionCleared = true;
            }
            prevHadValue = hasValue;
        });
    });

    let ariaSelection = $derived(
        hasValue
            ? ariaHandlers.handleAriaSelection({
                  value,
                  filteredItems,
                  hoverItemIndex,
                  listOpen,
                  multiple,
                  label,
              })
            : selectionCleared
              ? ariaCleared()
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
    let ariaContext = $derived.by(() => {
        if (activeTagLabel !== undefined) {
            return `${activeTagLabel} is active. Press Backspace to remove, or left and right arrow keys to move between selected options.`;
        }
        // Tracked triggers: the list opening/closing, the result count changing
        // (filtering), and the loading flag. hoverItemIndex is deliberately read
        // untracked — aria-activedescendant already announces each option as the
        // keyboard cursor lands on it, so recomputing here per keystroke made every
        // arrow key announce the option name twice AND re-read the whole result
        // count. Leaving the region's text unchanged means it simply stays silent
        // while arrowing, which is what the APG pattern expects.
        listOpen;
        filteredItems.length;
        loading;
        return untrack(() =>
            ariaHandlers.handleAriaContent({
                value,
                filteredItems,
                hoverItemIndex,
                listOpen,
                multiple,
                label,
                loading,
            }),
        );
    });

    // Initialize composables (creation order is effect order: value, hover, load options)
    const valueManager = useValue(selectState, {
        closeList,
        // Deferred: loadOptionsManager is created a few lines below
        retireStaleValidation: () => loadOptionsManager.retireValidationForFreshSelection(),
        onValueChange: (v) => onValueChange?.(v as unknown as SelectValue<Item, Multiple>),
        onSelectionChange: (v) => onSelectionChange?.(v as unknown as SelectValue<Item, Multiple>),
        onclear: (v) => onclear(v as unknown as SelectClearValue<Item, Multiple>),
        onselect: (s) => onselect?.(s as Item),
    });

    const hoverManager = useHover(selectState);

    const loadOptionsManager = useLoadOptions(selectState, {
        debounce: (fn, wait) => debounce(fn, wait),
        onloaded: (opts) => onloaded(opts as (Item | SelectItem)[]),
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
        if (
            e.key === 'ArrowDown' ||
            e.key === 'ArrowUp' ||
            e.key === 'Home' ||
            e.key === 'End' ||
            e.key === 'PageDown' ||
            e.key === 'PageUp' ||
            isTypeAhead
        ) {
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
        // A disabled Select never grabs focus on mount; the disabled effect
        // below also normalizes an initial `focused: true` back to false.
        if (disabled) return;
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

    // Sync the focused prop with real DOM focus, and close the list on unfocus.
    // `bind:focused` is documented as writable, so a parent write must move real
    // DOM focus: `focused = true` alone used to leave focus elsewhere while the
    // window keydown handler (gated only on `focused`) claimed arrow/Enter keys
    // page-wide, with no blur ever able to reset it. Transition-guarded so the
    // mount run doesn't closeList(), which wiped an initial filterText via
    // clearFilterTextOnBlur while the mount loadOptions fetch used the original text.
    let prevFocused = focused;
    $effect(() => {
        focused;
        untrack(() => {
            if (focused === prevFocused) return;
            prevFocused = focused;
            if (focused) {
                if (disabled) {
                    // A disabled Select cannot be focused programmatically
                    focused = false;
                    prevFocused = false;
                    return;
                }
                if (input && document.activeElement !== input) handleFocus();
            } else {
                closeList();
                selectState.activeValue = undefined;
                if (input && document.activeElement === input) input.blur();
            }
        });
    });

    // Setup filter text: every write after mount behaves like typing (opens the
    // list); only the mount run stays passive — an initial filterText filters
    // (and fetches, with loadOptions) without opening the list or moving focus.
    // A first-run flag, not a prevFilterText compare: the effect only reruns on
    // real changes, and the old compare against the last *typed* value silently
    // ignored a programmatic write that happened to equal it (fetching against
    // a closed list with loadOptions).
    let filterTextSeeded = false;
    $effect(() => {
        filterText;
        untrack(() => {
            if (!filterTextSeeded) {
                filterTextSeeded = true;
                return;
            }
            setupFilterText();
        });
    });

    // Fire onhoveritem. The callback runs untracked: reactive reads inside a
    // consumer callback must not become dependencies of this effect, and an
    // inline callback prop changing identity per parent render must not refire.
    $effect(() => {
        hoverItemIndex;
        untrack(() => onhoveritem?.(hoverItemIndex));
    });

    // Fire onfilter — untracked like onhoveritem; an onfilter that writes
    // `items` would otherwise loop through filteredItems
    $effect(() => {
        filteredItems;
        listOpen;
        untrack(() => {
            if (filteredItems && listOpen) onfilter?.(filteredItems as SelectRow<Item>[]);
        });
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
            // A closed list retires Tab's commit-intent; the next open starts
            // from an auto-parked cursor again (see handleTabKey). Reset on
            // close, not open: a type-ahead press that opens the list parks
            // the cursor in the same handler, and a reset-on-open flush would
            // clobber that intent.
            if (!listOpen) selectState.userNavigatedSinceOpen = false;
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

    // Dev-only: a custom listSnippet takes over option rendering, so the combobox's
    // aria-activedescendant only resolves if the consumer reproduces the option ids.
    // A dangling activedescendant points assistive tech at nothing, which is worse
    // than a plain listbox — so surface it rather than letting it fail silently.
    $effect(() => {
        if (!DEV) return;
        const activeId = _activeDescendantId;
        const hasListSnippet = !!listSnippet;
        untrack(() => {
            if (!hasListSnippet || !activeId || document.getElementById(activeId)) return;
            console.warn(
                `[svelte-select] listSnippet is rendering the list, but no element with id "${activeId}" ` +
                    "exists, so the combobox's aria-activedescendant points at nothing and screen readers " +
                    'cannot follow keyboard navigation. Give each option you render ' +
                    `id="listbox-${_id}-item-{index}" (matching its index in the snippet argument) and ` +
                    'role="option".',
            );
        });
    });

    // Dev-only: warn once the input is mounted if it has no robust accessible
    // name. The placeholder is only a last-resort fallback that some screen
    // readers ignore, so an unnamed combobox is a real gap worth surfacing.
    $effect(() => {
        // Gate on esm-env's DEV, never on Vite's build-time env object: that object
        // is undefined outside a Vite bundle, so reading its DEV flag threw at mount
        // for rollup/webpack/no-build consumers. esm-env resolves per-bundler and
        // tree-shakes this whole effect out of production builds.
        if (!DEV) return;
        input;
        ariaLabel;
        untrack(() => {
            if (!input) return;
            const named = !!ariaLabel || !!input.getAttribute('aria-labelledby') || (input.labels?.length ?? 0) > 0;
            if (!named) {
                console.warn(
                    '[svelte-select] The Select input has no accessible name. Pass `ariaLabel`, ' +
                        'or set the `id` prop and add a matching `<label for={id}>`, so screen readers ' +
                        'can announce the field. The placeholder is only a last-resort fallback and is ' +
                        'ignored by some assistive tech.',
                );
            }
        });
    });

    // The listbox needs its own accessible name (ARIA 1.2): `ariaLabel` covers
    // one recommended naming path, but the others — `id` + external `<label for>`
    // or an `aria-labelledby` supplied through `inputAttributes` — name only the
    // input; neither cascades to the floating list. Resolve a name when the list
    // opens, in the same precedence the input uses: explicit ariaLabel, then the
    // input's own aria-labelledby (forwarded), then the associated label —
    // referenced via aria-labelledby when it is external and has an id (live
    // text), otherwise a text snapshot. The consumer's label is never mutated.
    let listboxLabelledby = $state<string | undefined>();
    let listboxLabelText = $state<string | undefined>();
    $effect(() => {
        listOpen;
        ariaLabel;
        untrack(() => {
            listboxLabelledby = undefined;
            listboxLabelText = undefined;
            if (!listOpen || ariaLabel || !input) return;
            const inputLabelledby = input.getAttribute('aria-labelledby');
            if (inputLabelledby) {
                listboxLabelledby = inputLabelledby;
                return;
            }
            const labelEl = input.labels?.[0];
            if (!labelEl) return;
            // An implicit wrapping <label> contains the component itself, so
            // both aria-labelledby and a plain textContent snapshot would pull
            // in everything rendered inside (chips, options, live regions).
            // Snapshot only the label's own text — the nodes outside this
            // component's subtree.
            const wrapsComponent = container ? labelEl.contains(container) : false;
            if (!wrapsComponent && labelEl.id) {
                listboxLabelledby = labelEl.id;
            } else if (!wrapsComponent) {
                listboxLabelText = labelEl.textContent?.trim() || undefined;
            } else {
                let text = '';
                for (const node of labelEl.childNodes) {
                    if (node === container || (node instanceof Element && container && node.contains(container)))
                        continue;
                    text += node.textContent ?? '';
                }
                listboxLabelText = text.trim() || undefined;
            }
        });
    });

    // Auto update floating config
    $effect(() => {
        if (container && floatingConfig?.autoUpdate === undefined) {
            _floatingConfig.autoUpdate = true;
        }
    });

    // Disabled state
    $effect(() => {
        disabled;
        // listOpen is a tracked trigger too: neither setupFilterText nor the list
        // template gates on disabled, so a programmatic bind:listOpen (or
        // filterText) write while disabled would otherwise render an operable
        // list — this effect only reruns on `disabled` flips without it.
        listOpen;
        untrack(() => {
            if (!disabled) return;
            listOpen = false;
            filterText = '';
            // Disabling must also release focus: every keyboard handler gates
            // on `focused`, so a Select disabled while it held focus stayed
            // fully keyboard-operable (list toggling, Enter selection,
            // Backspace tag removal) despite being aria-disabled. This also
            // normalizes an initial `focused: true, disabled: true` mount.
            if (focused) focused = false;
            if (input && document.activeElement === input) input.blur();
        });
    });

    function applyGrouping(_items: SelectItem[]): SelectItem[] {
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
        // The input is no longer natively `disabled`, so it can still be
        // click-focused — keep a disabled Select non-interactive here.
        if (disabled) return;
        if (focused && input === document?.activeElement) return;
        if (e) {
            onfocus?.(e);
        }
        input?.focus();
        focused = true;
    }

    // A blur while the list is scrolling is deferred, not dropped: DOM focus is
    // already gone, so no further blur will ever fire — without a replay the list
    // stays open and the window keydown handler keeps hijacking keys.
    let pendingBlur: FocusEvent | boolean = false;

    async function handleBlur(e?: FocusEvent): Promise<void> {
        if (selectState.isScrolling) {
            pendingBlur = e ?? true;
            return;
        }
        pendingBlur = false;
        if (listOpen || focused) {
            if (e) onblur?.(e);
            closeList();
            focused = false;
            selectState.activeValue = undefined;
            input?.blur();
        }
    }

    // Replay a deferred blur once scrolling settles — unless focus is back on
    // the input (the scroll itself blurred it only transiently)
    $effect(() => {
        selectState.isScrolling;
        untrack(() => {
            if (selectState.isScrolling || pendingBlur === false) return;
            const deferred = pendingBlur === true ? undefined : pendingBlur;
            pendingBlur = false;
            if (document.activeElement !== input) void handleBlur(deferred);
        });
    });

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
        // Reset Tab's commit-intent synchronously, not only in the listOpen
        // effect below: a consumer callback that reopens the list in the same
        // flush would otherwise carry stale intent into the reopened list (the
        // effect would run once and only ever observe listOpen === true)
        selectState.userNavigatedSinceOpen = false;
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
        // Defence in depth: the disabled effect force-closes the list, but a
        // pointer must never mutate a disabled control's value even if a list
        // is momentarily rendered
        if (disabled) return;
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
        // Typing this session is commit-intent for Tab (see handleTabKey).
        // Marked here — on the real input event — rather than gating on the
        // current filterText, so a consumer-seeded initial value or text
        // retained across a close (clearFilterTextOnBlur={false}) can't arm a
        // commit the user never expressed.
        selectState.userNavigatedSinceOpen = true;
    }

    /**
     * Instance export — call via a `bind:this` reference: clears the selection,
     * filter text, and open/focus state back to an empty control. Does not fire
     * `onclear` (it is a programmatic reset, not a user clear).
     */
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
    onmousedown={(ev) => {
        // Pressing a non-input surface (the chevron area, a chip, multi-mode
        // whitespace) must not blur the input: the blur handler closes the
        // list, and this press's own pointerup — bubbling to handleClick —
        // would read that fresh closed state and toggle the list straight
        // back open. The input keeps its default behavior so caret placement
        // and text selection still work. (The list has its own guard and
        // stops propagation before reaching this one.)
        if (ev.target !== input) ev.preventDefault();
    }}
    bind:this={container}
    use:floatingRef
    role="none">
    {#if listOpen}
        <div
            use:floatingContent
            bind:this={list}
            class="svelte-select-list"
            class:prefloat
            style={listStyles}
            onscroll={hoverManager.handleListScroll}
            onscrollend={hoverManager.handleListScrollEnd}
            onmousemove={() => {
                // Real pointer movement over the open list is commit-intent for
                // Tab (see handleTabKey). mousemove — not mouseover — because
                // browsers synthesize mouseover when the list renders under a
                // stationary cursor, which is zero user action.
                selectState.userNavigatedSinceOpen = true;
            }}
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
            aria-label={ariaLabel ?? listboxLabelText}
            aria-labelledby={listboxLabelledby}
            aria-busy={loading || undefined}
            aria-multiselectable={multiple || undefined}
            id="listbox-{_id}">
            {#if listPrependSnippet}
                {@render listPrependSnippet()}
            {/if}
            {#if listSnippet}
                {@render listSnippet(filteredItems as SelectRow<Item>[])}
            {:else if filteredItems?.length > 0}
                {#snippet optionEntry(item: SelectItem, i: number)}
                    <!-- Non-selectable group headers are aria-hidden rather than
                         role="presentation": a listbox may only own option/group children,
                         and groups are transparent for that check, so a presentational row
                         inside one is an invalid listbox child (axe aria-required-children).
                         The group's accessible name still resolves via aria-labelledby,
                         which follows hidden targets. Selectable headers are real options. -->
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
                        role={isPresentationalHeader(item) ? undefined : 'option'}
                        id="listbox-{_id}-item-{i}"
                        aria-hidden={isPresentationalHeader(item) ? true : undefined}
                        aria-selected={isPresentationalHeader(item) ? undefined : hoverManager.isItemActive(item)}
                        aria-disabled={isPresentationalHeader(item) || isItemSelectableCheck(item) ? undefined : true}>
                        <div
                            class="item"
                            class:list-group-title={item.groupHeader}
                            class:active={hoverManager.isItemActive(item)}
                            class:first={i === 0}
                            class:last={i === filteredItems.length - 1}
                            class:hover={hoverItemIndex === i}
                            class:group-item={item.groupItem}
                            class:not-selectable={item?.selectable === false}>
                            {#if itemSnippet}
                                {@render itemSnippet(item as SelectRow<Item>, i)}
                            {:else}
                                {item?.[label]}
                            {/if}
                        </div>
                    </div>
                {/snippet}
                {#each groupedRows as row}
                    {#if row.type === 'group'}
                        <!-- A real listbox group named by its header (presentational or
                             selectable) via aria-labelledby, wrapping that group's options -->
                        <div role="group" aria-labelledby="listbox-{_id}-item-{row.headerIndex}">
                            {@render optionEntry(row.header, row.headerIndex)}
                            {#each row.options as opt}
                                {@render optionEntry(opt.item, opt.index)}
                            {/each}
                        </div>
                    {:else}
                        {@render optionEntry(row.item, row.index)}
                    {/if}
                {/each}
            {:else if !hideEmptyState}
                {#if emptySnippet}
                    {@render emptySnippet()}
                {:else if !loading}
                    <!-- Decorative: this state is announced via the role="status" live
                         region below, so hide the visual copy from AT to avoid stray
                         non-option text inside the listbox. The visible copy comes from
                         the same ariaEmpty/ariaLoading props as the announcement, so a
                         localized consumer never shows one language and announces
                         another. -->
                    <div class="empty" aria-hidden="true">{ariaEmpty()}</div>
                {:else}
                    <div class="empty" aria-hidden="true">{ariaLoading()}</div>
                {/if}
            {/if}
            {#if listAppendSnippet}
                {@render listAppendSnippet()}
            {/if}
        </div>
    {/if}

    <!-- Two dedicated polite live regions (role="status" implies aria-live="polite"
         + aria-atomic="true"). Atomic re-reads the whole region on any content change,
         which announces edits and clears reliably across screen readers — unlike the
         old aria-atomic="false"/aria-relevant="additions text" combination. The spans
         persist (only their text is gated on focus) so they exist before content
         changes, as live regions require. -->
    <span id="aria-selection-{_id}" role="status" class="a11y-text a11y-selection">
        {focused ? ariaSelection : ''}
    </span>
    <span id="aria-context-{_id}" role="status" class="a11y-text a11y-context">
        {focused ? ariaContext : ''}
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
                    <!-- In multiFullItemClearable mode the whole chip is the remove control, so it
                         must be a focusable button with a keyboard (Enter/Space) path — otherwise
                         removal is mouse-only. Otherwise it stays a non-semantic wrapper around the
                         dedicated remove button below. -->
                    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                    <!-- tabindex and role="button" are set together under the same guard, so the
                         element is interactive exactly when it is focusable (the linter can't see this). -->
                    <div
                        class="multi-item"
                        class:active={selectState.activeValue === i}
                        class:disabled
                        onclick={(ev) => {
                            ev.preventDefault();
                            // Gated like the keydown path below: a pointer must never
                            // mutate a disabled control's value (see handleItemClick)
                            if (multiFullItemClearable && !disabled) {
                                void valueManager.handleMultiItemClear(i);
                                // Like the dedicated remove button below: focus returns
                                // to the input so the removal announcement is not lost —
                                // the live regions are gated on `focused`, and a chip
                                // press that kept focus on the chip would otherwise
                                // remove the chip from the DOM and drop focus to <body>
                                // with the removal never announced.
                                handleFocus();
                            }
                        }}
                        onpointerup={multiFullItemClearable && !disabled
                            ? (ev) => {
                                  // Same containment as the dedicated remove button below:
                                  // removing a tag must not bubble to the container's list
                                  // toggle and pop the dropdown as a side effect
                                  ev.stopPropagation();
                              }
                            : undefined}
                        onkeydown={multiFullItemClearable && !disabled
                            ? (ev) => {
                                  if (ev.key !== 'Enter' && ev.key !== ' ') return;
                                  ev.preventDefault();
                                  ev.stopPropagation();
                                  valueManager.handleMultiItemClear(i);
                                  handleFocus();
                              }
                            : undefined}
                        role={multiFullItemClearable && !disabled ? 'button' : 'none'}
                        tabindex={multiFullItemClearable && !disabled ? 0 : undefined}
                        aria-label={multiFullItemClearable && !disabled
                            ? ariaRemoveItemLabel(String(item[label]))
                            : undefined}>
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
                                aria-label={ariaRemoveItemLabel(String(item[label]))}
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
                <div id="selected-{_id}" class="selected-item" class:hide-selected-item={hideSelectedItem}>
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
            style={inputStyles} />
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
            <!-- Same guards as the tag-remove buttons: mousedown is prevented so
                 clearing never steals focus from the input, and pointerup must not
                 bubble to the container's list toggle (a clear would reopen the list). -->
            <button
                type="button"
                class="icon clear-select"
                aria-label={ariaClearSelectLabel}
                onmousedown={(ev) => ev.preventDefault()}
                onpointerup={(ev) => ev.stopPropagation()}
                onclick={handleClear}>
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
    {:else if multiple && Array.isArray(value) && value.length > 0}
        {#each value as Item[] as item}
            <input {name} type="hidden" value={useJustValue ? item[itemId] : JSON.stringify(item)} />
        {/each}
    {:else if !multiple}
        <input {name} type="hidden" value={value ? (useJustValue ? justValue : JSON.stringify(value)) : ''} />
    {/if}

    {#if required && (!value || (Array.isArray(value) && value.length === 0))}
        {#if requiredSnippet}
            {@render requiredSnippet(value)}
        {:else}
            <!-- Constraint validation focuses the first invalid control — this one.
                 An aria-hidden element must never hold focus (and this one is
                 invisible), so forward it to the real combobox input immediately. -->
            <select class="required" required tabindex="-1" aria-hidden="true" onfocus={() => handleFocus()}></select>
        {/if}
    {/if}
</div>

<style>
    @import './styles/default.css';
</style>
