<script lang="ts">
    import { Select, type SelectValue } from '$lib';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(selectedValue: SelectValue) {
        console.log('This is selected value :', $state.snapshot(selectedValue));
    }
    function handleMultiple(selectedValues: SelectValue) {
        console.log('This is multi selected values :', $state.snapshot(selectedValues));
    }
</script>

<Select {items} onValueChange={handle} />
<br />
<Select {items} multiple onValueChange={handleMultiple} />
