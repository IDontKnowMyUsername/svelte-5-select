<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let {
        category = $bindable<string>(),
        item = $bindable<string>()
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
        if (category === categoriesAsStrings[0]) {
            results = drinkItems;
        } else if (category === categoriesAsStrings[1]) {
            results = foodItems;
        }
        return results;
    }
</script>

<Select
    bind:justValue={category}
    useJustValue={true}
    items={categoriesAsStrings}
/>
<Select
    bind:justValue={item}
    useJustValue={true}
    loadOptions={getCategoryItems}
    loadOptionsDeps={[category]}
/>