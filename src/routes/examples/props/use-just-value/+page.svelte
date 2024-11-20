<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 1, label: 'One' },
        { value: 2, label: 'Two' },
        { value: 3, label: 'Three' },
    ];

    let justValue = $state(3);
    let justValueMultiple = $state([1, 3]);
</script>

<Select {items} useJustValue bind:justValue />

<p>justValue: {justValue}</p>

<Select {items} useJustValue bind:justValue={justValueMultiple} multiple />

<p>justValueMultiple: {justValueMultiple}</p>
