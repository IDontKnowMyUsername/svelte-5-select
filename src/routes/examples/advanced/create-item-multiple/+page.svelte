<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem, SelectValue } from '$lib/types';

    let filterText = $state('');

    let value = $state<SelectItem[]>([]);

    type Item = {
        value: number;
        label: string;
        created: boolean;
    };

    let items = $state([
        { value: 1, label: 'name 1', created: false },
        { value: 2, label: 'name 2', created: false },
        { value: 3, label: 'name 3', created: false },
        { value: 4, label: 'name 4', created: false },
        { value: 5, label: 'name 5', created: false },
    ]);

    function handleFilter(foundedItems: SelectItem[]) {
        if (value?.find((i: any) => i.label === filterText)) return;
        if (foundedItems.length === 0 && filterText.length > 0) {
            const prev = items.filter((i) => !i.created);
            const maxValue = Math.max(...items.map(i => i.value), 0);
            items = [...prev, { value: maxValue + 1, label: filterText, created: true }];
        }
    }

    function handleChange(selectedValue: SelectValue) {
        items = items.map((i) => {
            i.created = false;
            return i;
        });
    }
</script>

<Select onchange={handleChange} multiple onfilter={handleFilter} bind:filterText bind:value {items}>
    {#snippet itemSnippet(item)}
        <div>
            {item.created ? 'Add new: ' : ''}
            {item.label}
        </div>
    {/snippet}
</Select>
