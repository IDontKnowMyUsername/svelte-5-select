<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
</script>

<Select bind:items listOpen>
    {#snippet itemSnippet(item)}
        * {item.label} *
    {/snippet}
</Select>
