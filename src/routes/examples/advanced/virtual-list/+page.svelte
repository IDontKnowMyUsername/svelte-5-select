<script lang="ts">
    import VirtualList from 'svelte-virtual-list';
    import { tick } from 'svelte';
    import Select from '$lib/Select.svelte';

    let items = $state<string[]>([]);
    for (let i = 0; i < 1000; i++) {
        items.push(i.toString());
    }

    let value = $state<string | undefined>(undefined);
    let listOpen = $state(false);
    let activeIndex = $state<number | null>(null);
    let justValue = $state();
    let hoverItemIndex = $state(0);

    function handleClick(i: number) {
        activeIndex = i;
        value = items[i];
        listOpen = false;
    }

    function handleHover(e: number) {
        hoverItemIndex = e;
    }

    async function handleListOpen() {
        if (!value) return;
        await tick();
        hoverItemIndex = activeIndex ?? 0;
        listOpen = !listOpen;
    }

    $effect(() => {
        handleListOpen();
    });

    let style = "color:red";
</script>

<Select
    --list-max-height="600px"
    {items}
    bind:listOpen
    bind:value
    bind:justValue
    bind:hoverItemIndex
    onhoveritem={handleHover}>
    {#snippet listSnippet(filteredItems)}
        {#if filteredItems && filteredItems.length > 0}
            <div>
                <VirtualList
                    items={filteredItems}
                    itemHeight={30}
                    height="300px"
                    let:item>
                    {@const index = filteredItems.indexOf(item)}
                    <button
                        tabindex="0"
                        class="item"
                        class:active={value === item.value}
                        class:hover={hoverItemIndex === index}
                        onclick={() => handleClick(index)}
                        onfocus={() => handleHover(index)}
                        onmouseover={() => handleHover(index)}>
                        Item: {item.label}, Index: #{index}
                    </button>
                </VirtualList>
            </div>
        {/if}
    {/snippet}
</Select>

<style>
    .item {
        height: 30px;
        display: flex;
        align-items: center;
        padding: 20px;
        cursor: default;
    }

    .item.hover {
        background: var(--item-hover-bg, #e7f2ff);
    }

    .item.active {
        background: var(--item-is-active-bg, #007aff);
        color: var(--item-is-active-color, #fff);
    }
</style>
