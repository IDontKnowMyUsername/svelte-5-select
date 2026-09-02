<script lang="ts">
    import { Select, type SelectItem } from '$lib';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(foundedItems: SelectItem[]) {
        console.log('Filtered items 🔍: ', $state.snapshot(foundedItems));
    }
</script>

<Select {items} onfilter={handle} />
