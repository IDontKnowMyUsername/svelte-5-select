<script lang="ts">
    import Select from '$lib/Select.svelte';

    /**
     * @typedef {Object} Props
     * @property {string} [filterText]
     */

    /** @type {Props} */
    let { filterText = $bindable('') } = $props();

    let items = [
        { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
        { value: 'pizza', label: 'Pizza', group: 'Savory' },
        { value: 'cake', label: 'Cake', group: 'Sweet', selectable: false },
        { value: 'chips', label: 'Chips', group: 'Savory' },
        { value: 'ice-cream', label: 'Ice Cream', group: 'Sweet' },
    ];

    let value = $state('');
</script>

<Select {items} groupBy={(item) => item.group || ''} groupHeaderSelectable={false} bind:value bind:filterText />
