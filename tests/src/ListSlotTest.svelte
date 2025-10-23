<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let items = $state(['one', 'two']);
    let value = $state('one');
</script>

<Select bind:items bind:value listOpen>
    {#snippet listSnippet(filteredItems: SelectItem[])}
        {#each filteredItems as item}
            {item.label}
        {/each}
    {/snippet}
</Select>