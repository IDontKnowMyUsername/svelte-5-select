<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
    let value = $state(['one', 'two']);
</script>

<Select bind:items bind:value multiple>
    {#snippet selectionSnippet(selection, index)}
        <!-- Raw string items leave Item uninferrable; at runtime each tag is the converted item object -->
        Index: {index} Slot: {(selection as unknown as { label: string }).label}
    {/snippet}
</Select>
