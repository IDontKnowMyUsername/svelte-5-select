<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = ['One', 'Two', 'Three'];

    let collection = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    let collectionData = $state(collection[1]);
    let collectionMultipleData = $state([collection[0], collection[2]]);

    $inspect('collectionMultipleData', collectionMultipleData);
</script>

<h4>Single</h4>
<Select {items} value="One" />
<br />
<Select items={collection} bind:value={collectionData} />
<p>{collectionData?.label || ''}</p>

<h4>Multiple</h4>
<Select items={collection} multiple bind:value={collectionMultipleData} />
<p>
    {#each collectionMultipleData as item, index}
        {item.label}{collectionMultipleData.length - 1 !== index ? ', ' : ''}
    {/each}
</p>
