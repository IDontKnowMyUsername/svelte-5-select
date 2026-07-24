<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
    let value = $state<string | undefined>(undefined);
</script>

<Select bind:items bind:value required>
    {#snippet requiredSnippet(value)}
        <input class="custom-required" required tabindex="-1" value={value ? 'set' : ''} />
    {/snippet}
</Select>
