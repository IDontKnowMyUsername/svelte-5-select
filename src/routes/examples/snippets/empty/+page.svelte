<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let items: SelectItem[] = [];
</script>

<p>using <code>emptySnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items}>
    {#snippet emptySnippet()}
        <div>Nothing to see here...</div>
    {/snippet}
</Select>

<style>
    div {
        padding: 10px;
        text-align: center;
    }
</style>
