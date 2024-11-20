<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>listPrependSnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items} listOpen>
    {#snippet listPrependSnippet()}
        <div style="background-color:LightPink;">⬇️ BEFORE ⬇️</div>
    {/snippet}
</Select>
