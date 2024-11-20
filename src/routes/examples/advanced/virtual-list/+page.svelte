<script>
    import VirtualList from 'svelte-tiny-virtual-list';
    import { tick } from 'svelte';
    import Select from '$lib/Select.svelte';

    let items = $state([]);
    for (let i = 0; i < 1000; i++) {
        items.push(i.toString());
    }

    let value = $state(undefined);
    let listOpen = $state(false);
    let activeIndex = $state(null);
    let justValue = $state();
    let hoverItemIndex = $state(0);

    function handleClick(i) {
        activeIndex = i;
        value = items[i];
        listOpen = false;
    }

    function handleHover(e) {
        hoverItemIndex = e;
    }

    async function handleListOpen() {
        if (!value) return;
        await tick();
        hoverItemIndex = activeIndex;
    }

    $effect(() => {
        handleListOpen(listOpen);
    });
</script>

<p style="color:red">** wait for "svelte-tiny-virtual-list" updated to svelte 5 support **</p>
<Select
    --list-max-height="300px"
    {items}
    bind:listOpen
    bind:value
    bind:justValue
    bind:hoverItemIndex
    onhoverItem={(e) => handleHover(e.detail)}>
    {#snippet listSnippet(filteredItems)}
        {#if filteredItems && filteredItems.length > 0}
            <VirtualList width="100%" height={200} itemCount={filteredItems.length} itemSize={30}>
                {#snippet itemSnippet(item, index)}
                    <div>Item: {filteredItems[index].label}, Index: #{index}</div>
                    <div
                        role="button"
                        class="item"
                        class:active={activeIndex === index}
                        class:hover={hoverItemIndex === index}
                        {style}
                        onclick={() => handleClick(index)}
                        onfocus={() => handleHover(index)}
                        onmouseover={() => handleHover(index)}>
                        Item: {filteredItems[index].label}, Index: #{index}
                    </div>
                {/snippet}
            </VirtualList>
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
