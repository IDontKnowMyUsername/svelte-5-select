<script>
    import { LineNumbers } from 'svelte-highlight';
    import Select from '$lib/Select.svelte';

    let items = [
        { foo: 'value of One with value key foo', label: 'One' },
        { foo: 'value of Two with value key foo', label: 'Two' },
        { foo: 'value of Three with value key foo', label: 'Three' },
    ];

    let justValue = $state();
</script>

<Select {items} itemId="foo" bind:justValue />

<p>{justValue}</p>
