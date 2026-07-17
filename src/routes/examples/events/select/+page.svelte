<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib/types';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(selection: SelectItem) {
        console.log('An option was picked on the svelte select 🤯 ', $state.snapshot(selection));
    }
</script>

<Select {items} onselect={handle} />
