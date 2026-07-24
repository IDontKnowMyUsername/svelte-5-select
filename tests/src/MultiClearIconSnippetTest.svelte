<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
    let value = $state(['one']);
</script>

<Select bind:items bind:value multiple>
    {#snippet multiClearIconSnippet()}
        <span class="custom-multi-clear">✕</span>
    {/snippet}
</Select>
