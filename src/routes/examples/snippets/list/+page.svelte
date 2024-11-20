<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    let value = $state([]);

    function handleClick(item) {
        if (!value) value = [item];
        else value = [...value, item];
    }
</script>

<p>using <code>listSnippet</code></p>
<p>parameter <code>filteredItems</code></p>
<Select {items} bind:value multiple>
    {#snippet listSnippet(filteredItems)}
        {#each filteredItems as item, index}
            <div>
                <button aria-label={item.label} onclick={() => handleClick(item)}>
                    {item.label}
                </button>
            </div>
        {/each}
    {/snippet}
</Select>

<style>
    div {
        display: flex;
        flex-direction: column;
        font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
    }

    button {
        font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
        border: 0;
        background-color: transparent;
        height: 50px;
        display: flex;
        align-items: center;
        padding: 20px;
        cursor: pointer;
    }
    button:hover {
        background-color: skyblue;
    }
</style>
