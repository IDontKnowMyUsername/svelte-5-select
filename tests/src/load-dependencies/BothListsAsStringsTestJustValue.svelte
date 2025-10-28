<script lang="ts">
    import Select from '$lib/Select.svelte';

    let {
        category = $bindable<string>(),
        item = $bindable<string>()
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
        if (category === categoriesAsStrings[0]) {
            results = drinkItemsAsStrings;
        } else if (category === categoriesAsStrings[1]) {
            results = foodItemsAsStrings;
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