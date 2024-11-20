<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>chevronIconSnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items} showChevron>
    {#snippet chevronIconSnippet()}
        <div>⬇️</div>
    {/snippet}
</Select>
