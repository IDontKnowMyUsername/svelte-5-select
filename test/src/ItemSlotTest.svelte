<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state(['one', 'two']);
</script>

<Select bind:items listOpen>
    {#snippet itemSnippet({ item })}
        * {item.label} *
    {/snippet}
</Select>
