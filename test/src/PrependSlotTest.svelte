<script>
    import Select from '../../src/lib/Select.svelte';

    let items = $state(['one', 'two']);
    let value = $state();
</script>

<Select bind:items bind:value>
    {#snippet prependSnippet()}
        <div class="before">Before it all</div>
    {/snippet}
</Select>
