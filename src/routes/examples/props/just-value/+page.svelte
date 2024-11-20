<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'value-of-one', label: 'One' },
        { value: 'value-of-two', label: 'Two' },
        { value: 'value-of-three', label: 'Three' },
    ];

    let justValue = $state();
    let justValueMultiple = $state();
</script>

<Select {items} bind:justValue />

<p>justValue: {justValue}</p>

<Select {items} bind:justValue={justValueMultiple} multiple />

<p>justValueMultiple: {justValueMultiple}</p>
