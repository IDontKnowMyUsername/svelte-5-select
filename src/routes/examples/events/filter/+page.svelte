<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(foundedItems) {
        console.log('Filtered items 🔍: ', $state.snapshot(foundedItems));
    }
</script>

<Select {items} onfilter={handle} />
