<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
    let value = $state('one');
</script>

<Select bind:items bind:value>
    <!-- @migration-task: migrate this slot by hand, `clear-icon` is an invalid identifier -->
    <!-- @migration-task: migrate this slot by hand, `clear-icon` is an invalid identifier -->
    {#snippet clearIconSnippet()}
        x
    {/snippet}
</Select>
