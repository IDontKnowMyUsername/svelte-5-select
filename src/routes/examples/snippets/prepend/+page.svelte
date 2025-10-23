<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>prependSnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items}>
    {#snippet prependSnippet()}
        <div>🦾</div>
    {/snippet}
</Select>

<style>
    div {
        margin-right: 5px;
    }
</style>
