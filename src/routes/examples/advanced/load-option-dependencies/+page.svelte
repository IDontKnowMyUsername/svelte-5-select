<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let categories = ['Drinks', 'Food'];
    let select1Value = $state<SelectItem | undefined>();
    let listOpen = $state(false);

    let drinkItems = ['Beer', 'Juice', 'Liquor'];
    let foodItems = ['Fries', 'Hamburger', 'Pizza'];

    let select2Value = $state<SelectItem | undefined>();
    let select2Items = $state<string[]>([]);

    async function getCategoryItems(): Promise<string[]> {
        let result: string[] = [];
        console.log('Select 1 value:', select1Value?.value);
        if (select1Value?.value === 'Drinks') {
            result = drinkItems;
        } else if (select1Value?.value === 'Food') {
            result = foodItems;
        }
        console.log('Returning items:', result);
        return result;
    }
</script>

<div style="padding: 20px;">
    <h2>Category Select</h2>
    <Select
        bind:listOpen
        bind:value={select1Value}
        items={categories}
    />

    <div style="margin: 10px 0;">
        Selected: {select1Value?.value ?? 'None'}
    </div>

    <h2 style="margin-top: 30px;">Items Select</h2>
    <Select
        bind:value={select2Value}
        bind:items={select2Items}
        loadOptions={getCategoryItems}
        loadOptionsDeps={[select1Value]}
    />

    <div style="margin: 10px 0;">
        Items in state: {JSON.stringify(select2Items)}
    </div>

    <div style="margin: 10px 0;">
        Selected: {select2Value?.value ?? 'None'}
    </div>
</div>