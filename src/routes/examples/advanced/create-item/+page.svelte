<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let filterText = $state('');

    type Item = {
        value: number;
        label: string;
        created: boolean;
    };

    let items = $state<Item[]>([
        { value: 1, label: 'name 1', created: false },
        { value: 2, label: 'name 2', created: false },
        { value: 3, label: 'name 3', created: false },
        { value: 4, label: 'name 4', created: false },
        { value: 5, label: 'name 5', created: false },
    ]);

    function handleFilter(foundedItems: SelectItem[]) {
        if (foundedItems.length === 0 && filterText.length > 0) {
            const prev = items.filter((i) => !i.created);
            items = [...prev, { value: Number(filterText), label: filterText, created: true }];
        }
    }

    function handleChange(selectedValue: any) {
        items = items.map((i) => {
            i.created = false;
            return i;
        });
    }
</script>

<Select onchange={handleChange} onfilter={handleFilter} bind:filterText {items}>
    {#snippet itemSnippet(item: SelectItem, index)}
        <div>
            {item.created ? 'Add new: ' : ''}
            {item.label}
        </div>
    {/snippet}
</Select>
