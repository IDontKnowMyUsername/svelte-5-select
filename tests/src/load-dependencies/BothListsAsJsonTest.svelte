<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let {
        category = $bindable<SelectItem>(),
        item = $bindable<SelectItem>()
    } = $props();

    const categories = [
        {value:1, label:'Drinks'},
        {value:2, label:'Food'}
    ];

    const drinkItemsAsStrings: string[] = [
        'Beer',
        'Juice',
        'Liquor'
    ];

    const foodItemsAsStrings: string[] = [
        'Fries',
        'Hamburger',
        'Pizza'
    ];

    async function getCategoryItems(): Promise<string[]> {
        let results: string[] = [];
        if (category?.label === categories[0]?.label) {
            results = drinkItemsAsStrings;
        } else if (category?.label === categories[1]?.label) {
            results = foodItemsAsStrings;
        }
        return results;
    }
</script>

<Select
    bind:value={category}
    items={categories}
/>
<Select
    bind:value={item}
    loadOptions={getCategoryItems}
    loadOptionsDeps={[category]}
/>