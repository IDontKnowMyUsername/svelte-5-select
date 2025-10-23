<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>itemSnippet</code></p>
<p>parameter <code>items, index</code></p>
<Select {items}>
    {#snippet itemSnippet(item, index)}
        <div>
            {index}: {item.label}
        </div>
    {/snippet}
</Select>
