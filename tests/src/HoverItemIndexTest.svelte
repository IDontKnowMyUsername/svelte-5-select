<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let items: SelectItem[] = [];

    for (let i = 0; i < 100; i++) {
        items.push({ label: i.toString(), value: i, group: 'a' });
    }

    let value = $state<SelectItem | null>(null);

    let { hoverItemIndex = $bindable(0) } = $props();
</script>

<Select {items} bind:value groupBy={(i) => i.group || ''} bind:hoverItemIndex />

{#if value}
    <p>
        Selected value: {value.label}
    </p>
{/if}
