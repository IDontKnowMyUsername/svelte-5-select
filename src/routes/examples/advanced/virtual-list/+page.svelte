<script lang="ts">
    import { Select, type SelectItem } from '$lib';

    // A windowed list: only the rows inside the viewport (plus a little
    // overscan) exist in the DOM, positioned absolutely inside a spacer that is
    // the full list's height. Fixed row heights keep the arithmetic trivial.
    const ROW = 32;
    const VIEWPORT = 300;
    const OVERSCAN = 4;

    const items: SelectItem[] = Array.from({ length: 10_000 }, (_, i) => ({ value: i, label: `Item ${i}` }));

    let value = $state<SelectItem | undefined>(undefined);
    let listOpen = $state(false);
    let hoverItemIndex = $state(0);
    let viewport = $state<HTMLDivElement | undefined>(undefined);
    let scrollTop = $state(0);

    // `listSnippet` takes over row rendering, so the component's own
    // scroll-into-view can only find rows that exist. Keep the keyboard cursor
    // inside the window by scrolling the viewport to it first. Mouse hover only
    // ever lands on rendered rows, so this is a no-op for the pointer.
    $effect(() => {
        const top = hoverItemIndex * ROW;
        if (!viewport) return;
        if (top < viewport.scrollTop) viewport.scrollTop = top;
        else if (top + ROW > viewport.scrollTop + VIEWPORT) viewport.scrollTop = top + ROW - VIEWPORT;
        scrollTop = viewport.scrollTop;
    });

    // Pointer selection only: the combobox input keeps focus while the list is
    // open (the component prevents mousedown on the list), so Enter/Space on the
    // hovered row are handled by the component's own keyboard navigation. Rows
    // carry tabindex="-1" like the built-in ones — focusable by script, never by Tab.
    function select(item: SelectItem) {
        value = item;
        listOpen = false;
    }
</script>

<p>using <code>listSnippet</code> to window 10,000 rows</p>
<p>
    Each rendered row keeps the documented contract — <code>role="option"</code> and
    <code>id="listbox-{'{id}'}-item-{'{index}'}"</code> — so <code>aria-activedescendant</code> and the keyboard still
    work. The <code>id</code> prop is set so the ids are predictable.
</p>

<Select id="virtual" {items} bind:value bind:listOpen bind:hoverItemIndex>
    {#snippet listSnippet(filteredItems)}
        {const start = Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN)}
        {const end = Math.min(filteredItems.length, Math.ceil((scrollTop + VIEWPORT) / ROW) + OVERSCAN)}
        <div
            class="viewport"
            style:height="{VIEWPORT}px"
            bind:this={viewport}
            onscroll={() => (scrollTop = viewport?.scrollTop ?? 0)}>
            <div class="spacer" style:height="{filteredItems.length * ROW}px">
                {#each filteredItems.slice(start, end) as item, offset (item.value)}
                    {const index = start + offset}
                    {const selected = value?.value === item.value}
                    <div
                        id="listbox-virtual-item-{index}"
                        role="option"
                        aria-selected={selected}
                        class={['row', { hover: hoverItemIndex === index, active: selected }]}
                        style:top="{index * ROW}px"
                        style:height="{ROW}px"
                        tabindex="-1"
                        onmousemove={() => (hoverItemIndex = index)}
                        onfocus={() => (hoverItemIndex = index)}
                        onclick={() => select(item)}
                        onkeydown={(ev) => ev.preventDefault()}>
                        {item.label}
                    </div>
                {/each}
            </div>
        </div>
    {/snippet}
</Select>

<style>
    .viewport {
        overflow-y: auto;
    }

    .spacer {
        position: relative;
    }

    .row {
        position: absolute;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        padding: 0 20px;
        cursor: default;
    }

    .row.hover {
        background: var(--item-hover-bg, #e7f2ff);
    }

    .row.active {
        background: var(--item-is-active-bg, #007aff);
        color: var(--item-is-active-color, #fff);
    }
</style>
