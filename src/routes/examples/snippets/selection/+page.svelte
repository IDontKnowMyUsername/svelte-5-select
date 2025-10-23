<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>selectionSnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items}>
    {#snippet selectionSnippet(selection)}
        <div>
            🎉 {selection.label} 🎉
        </div>
    {/snippet}
</Select>

<br />

<Select {items} multiple>
    {#snippet selectionSnippet(selection, index)}
        <div>
            🎉 {index} : {selection.label} 🎉
        </div>
    {/snippet}
</Select>
