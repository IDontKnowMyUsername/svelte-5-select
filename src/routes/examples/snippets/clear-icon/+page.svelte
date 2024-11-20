<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>clearIconSnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items}>
    {#snippet clearIconSnippet()}
        <div>❌</div>
    {/snippet}
</Select>

<style>
    div {
        cursor: default;
    }
</style>
