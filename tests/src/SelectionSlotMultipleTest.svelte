<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
    let value = $state(['one', 'two']);
</script>

<Select bind:items bind:value multiple>
    {#snippet selectionSnippet(selection, index)}
        Index: {index} Slot: {!Array.isArray(selection) ? selection.label : ''}
    {/snippet}
</Select>
