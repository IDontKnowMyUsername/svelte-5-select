<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let {
        category = $bindable<SelectItem>(),
        item = $bindable<SelectItem>()
    } = $props();

    const categoriesAsStrings = ['Drinks', 'Food'];

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
        if (category?.label === categoriesAsStrings[0]) {
            results = drinkItemsAsStrings;
        } else if (category?.label === categoriesAsStrings[1]) {
            results = foodItemsAsStrings;
        }
        return results;
    }
</script>

<Select
    bind:value={category}
    items={categoriesAsStrings}
/>
<Select
    bind:value={item}
    loadOptions={getCategoryItems}
    loadOptionsDeps={[category]}
/>