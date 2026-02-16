<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { JustValue } from '$lib/types';

    let items = [
        { value: 'value-of-one', label: 'One' },
        { value: 'value-of-two', label: 'Two' },
        { value: 'value-of-three', label: 'Three' },
    ];

    let justValue = $state<JustValue>(null);
    let justValueMultiple = $state<JustValue>(null);
</script>

<Select {items} bind:justValue />

<p>justValue: {justValue}</p>

<Select {items} bind:justValue={justValueMultiple} multiple />

<p>justValueMultiple: {justValueMultiple}</p>
