<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    let checked = $state<string[]>([]);
    let value = $derived(checked.map((c) => items.find((i) => i.value === c)));

    function isItemChecked(itemValue: string): boolean {
        return checked.includes(itemValue);
    }

    function handleChange(selectedItem: any) {
        if (Array.isArray(selectedItem)) checked = [];
        checked.includes(selectedItem.value)
            ? (checked = checked.filter((i) => i != selectedItem.value))
            : (checked = [...checked, selectedItem.value]);
    }

    $inspect('PARENT VALUE', value);
    $inspect('PARENT CHECKED', checked);
</script>

<Select
    {items}
    {value}
    onselect={handleChange}
    onclear={handleChange}
    multiple={true}
    filterSelectedItems={false}
    closeListOnChange={false}>
    {#snippet itemSnippet(item, index)}
        <div class="item">
            <label for={item.value}>
                <input
                    type="checkbox"
                    id={`${item.value}${index}`}
                    checked={isItemChecked(item.value)}
                    onchange={() => handleChange(item)}
                />
                {item.label}
            </label>
        </div>
    {/snippet}
</Select>

<style>
    .item {
        pointer-events: none;
    }
</style>
