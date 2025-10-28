<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let {
        category = $bindable<SelectItem>(),
        item = $bindable<SelectItem>()
    } = $props();

    const categoriesAsStrings = ['Drinks', 'Food'];

    const drinkItems = [
        {value:'B', label:'Beer'},
        {value:'J', label:'Juice'},
        {value:'L', label:'Liquor'}
    ];

    const foodItems = [
        {value:1, label:'Fries'},
        {value:2, label:'Hamburger'},
        {value:3, label:'Pizza'}
    ];

    async function getCategoryItems(): Promise<SelectItem[]> {
        let results: SelectItem[] = [];
        if (category?.label === categoriesAsStrings[0]) {
            results = drinkItems;
        } else if (category?.label === categoriesAsStrings[1]) {
            results = foodItems;
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