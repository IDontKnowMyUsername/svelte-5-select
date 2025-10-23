<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let items = [
        { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
        { value: 'pizza', label: 'Pizza', group: 'Savory', selectable: false },
        { value: 'cake', label: 'Cake', group: 'Sweet', selectable: false },
        { value: 'chips', label: 'Chips', group: 'Savory' },
        { value: 'ice-cream', label: 'Ice Cream', group: 'Sweet' },
    ];

    let value = $state<any>();
    let selectedLabel = $derived((value as SelectItem)?.label);
</script>

<Select {items} groupHeaderSelectable groupBy={(item) => item.group ?? ''} bind:value />

<p>
    {selectedLabel}
</p>
