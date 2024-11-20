<script>
    import Select from '$lib/Select.svelte';

    let collection = [
        { value: 'one', foo: 'label of One with label key foo' },
        { value: 'two', foo: 'label of Two with label key foo' },
        { value: 'three', foo: 'label of Three with label key foo' },
    ];

    let value = $state();
</script>

<Select items={collection} label="foo" bind:value />

<p>label: {value?.['foo']}</p>
