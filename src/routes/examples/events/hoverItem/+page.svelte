<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(hoverItemIndex) {
        console.log('Hover item index :', hoverItemIndex);
    }
</script>

<Select {items} onhoveritem={handle} />
