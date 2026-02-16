<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectValue } from '$lib/types';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(clearItem: SelectValue) {
        console.log('You clear the svelte select 🤯 ', $state.snapshot(clearItem));
    }
</script>

<Select {items} onclear={handle} />
<br />
<Select {items} onclear={handle} multiple />
