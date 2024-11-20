<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(selectedValue) {
        console.log('This is selected value :', $state.snapshot(selectedValue));
    }
    function handleMultiple(selectedValues) {
        console.log('This is multi selected values :', $state.snapshot(selectedValues));
    }
</script>

<Select {items} oninput={handle} />
<br />
<Select {items} multiple oninput={handleMultiple} />
