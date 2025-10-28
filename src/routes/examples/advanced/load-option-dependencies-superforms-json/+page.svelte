<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';
    import { orderSchema } from '../../../../lib-example/order';
    import { zodClient } from 'sveltekit-superforms/adapters';
    import { superForm } from 'sveltekit-superforms';

    let categories = [{value:1, label:'Drinks'}, {value:2, label:'Food'}];

    let { data } = $props();
    const { form, errors, constraints, enhance, tainted, submitting, allErrors } = superForm(data.form, {
        dataType: 'json',
        validators: zodClient(orderSchema),
        validationMethod: 'oninput',
        customValidity: true
    });

    const hasErrors = $derived($allErrors.length > 0);
    const isDirty = $derived(Object.keys($tainted ?? {}).length > 0);
    const isValid = $derived(!hasErrors && isDirty);

    let drinkItems = [{value:'B', label:'Beer'}, {value:'J', label:'Juice'}, {value:'L', label:'Liquor'}];
    let foodItems = [{value:1, label:'Fries'}, {value:2, label:'Hamburger'}, {value:3, label:'Pizza'}];

    const select1Valid = $derived(!($form.category === '' || $form.category === undefined));

    async function getCategoryItems(): Promise<SelectItem[] | string[]> {
        let result: SelectItem[] = [];
        console.log('Select 1:', $form.category?.value);
        if ($form.category?.value == 1) {
            result = drinkItems;
        } else if ($form.category?.value === 2) {
            result = foodItems;
        }
        console.log('Returning items:', result);
        return result;
    }
</script>

<form method="POST" >
    <div style="padding: 20px;">
        <h2>Category Select</h2>
        <Select
            bind:value={$form.category}
            items={categories}
        />

        <div style="margin: 10px 0;">
            Selected: {JSON.stringify($form.category) ?? 'None'}
        </div>

        <h2 style="margin-top: 30px;">Items Select</h2>
        <Select
            bind:value={$form.item}
            isDisabled={!select1Valid}
            loadOptions={getCategoryItems}
            loadOptionsDeps={[$form.category]}
        />

        <div style="margin: 10px 0;">
            Select 1 has valid value: {select1Valid}
            <br/>
            Select 2 disabled: {!select1Valid}
            <br/>
            Selected: {JSON.stringify($form.item) ?? 'None'}
        </div>
        <div style="margin: 10px 0;">
            Is the form valid: {isValid}
            Form errors: {JSON.stringify($errors)};
        </div>

        <button type="submit" disabled={!isValid}>
            {$submitting ? 'Submitting...' : 'Submit'}
        </button>
    </div>
</form>
