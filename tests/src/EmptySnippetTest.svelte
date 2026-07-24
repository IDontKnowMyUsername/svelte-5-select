<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state<string[]>([]);
    let listOpen = $state(true);
</script>

<Select bind:items bind:listOpen>
    {#snippet emptySnippet()}
        <div class="custom-empty">Nothing to see</div>
    {/snippet}
</Select>
