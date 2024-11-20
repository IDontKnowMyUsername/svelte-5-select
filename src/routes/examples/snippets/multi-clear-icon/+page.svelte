<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>multiClearIconSnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items} multiple>
    {#snippet multiClearIconSnippet()}
        <div>❌</div>
    {/snippet}
</Select>
