<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
</script>

<Select bind:items loading>
    {#snippet loadingIconSnippet()}
        <span class="custom-loading">wait</span>
    {/snippet}
</Select>
