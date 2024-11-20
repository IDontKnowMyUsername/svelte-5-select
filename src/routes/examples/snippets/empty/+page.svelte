<script>
    import Select from '$lib/Select.svelte';

    let items = [];
</script>

<p>using <code>emptySnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items}>
    {#snippet emptySnippet()}
        <div>Nothing to see here...</div>
    {/snippet}
</Select>

<style>
    div {
        padding: 10px;
        text-align: center;
    }
</style>
