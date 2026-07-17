<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectValue } from '$lib/types';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(selectedValue: SelectValue) {
        console.log('Selection changed on the svelte select 🤯 ', $state.snapshot(selectedValue));
    }
</script>

<Select {items} onSelectionChange={handle} />
