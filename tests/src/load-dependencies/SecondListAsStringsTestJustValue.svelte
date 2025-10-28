<script lang="ts">
    import Select from '$lib/Select.svelte';

    let {
        category = $bindable<string>(),
        item = $bindable<string>()
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
        if (category === categories[0]?.value) {
            results = drinkItemsAsStrings;
        } else if (category === categories[1]?.value) {
            results = foodItemsAsStrings;
        }
        return results;
    }
</script>

<Select
    bind:justValue={category}
    useJustValue={true}
    items={categories}
/>
<Select
    bind:justValue={item}
    useJustValue={true}
    loadOptions={getCategoryItems}
    loadOptionsDeps={[category]}
/>