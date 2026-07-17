<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let items: SelectItem[] = [];

    for (let i = 0; i < 100; i++) {
        items.push({ label: i.toString(), value: i, group: 'a' });
    }

    let value = $state<SelectItem | null>(null);

    // bind: harness (not an instance poke): rerender clobbers unbound bindables,
    // and the test must observe both directions of the binding
    let hoverItemIndex = $state(0);
</script>

<Select {items} bind:value groupBy={(i) => i.group || ''} bind:hoverItemIndex />

<div data-testid="hover-index">{hoverItemIndex}</div>
<button data-testid="set-hover-index" onclick={() => (hoverItemIndex = 5)}>set hover</button>

{#if value}
    <p>
        Selected value: {value.label}
    </p>
{/if}
