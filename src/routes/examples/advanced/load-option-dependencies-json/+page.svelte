<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let categories = [{value:1, label:'Drinks'}, {value:2, label:'Food'}];

    let select1Value = $state<SelectItem | undefined>();
    let select2Value = $state<SelectItem | undefined>();

    let listOpen = $state(false);

    let drinkItems = [{value:'B', label:'Beer'}, {value:'J', label:'Juice'}, {value:'L', label:'Liquor'}];
    let foodItems = [{value:1, label:'Fries'}, {value:2, label:'Hamburger'}, {value:3, label:'Pizza'}];

    async function getCategoryItems(): Promise<SelectItem[] | string[]> {
        let result: SelectItem[] = [];
        console.log('Select 1 value:', select1Value?.value);
        if (select1Value?.value == 1) {
            result = drinkItems;
        } else if (select1Value?.value === 2) {
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

        loadOptions={getCategoryItems}
        loadOptionsDeps={[select1Value]}
    />

    <div style="margin: 10px 0;">
        Items in state: {JSON.stringify(select2Value)}
    </div>

    <div style="margin: 10px 0;">
        Selected: {select2Value?.value ?? 'None'}
    </div>
</div>