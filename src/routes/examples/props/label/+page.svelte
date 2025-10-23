<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let collection = [
        { value: 'one', foo: 'label of One with label key foo' },
        { value: 'two', foo: 'label of Two with label key foo' },
        { value: 'three', foo: 'label of Three with label key foo' },
    ];

    let value = $state<SelectItem | undefined>();
</script>

<Select items={collection} label="foo" bind:value />

<p>label: {value?.['foo']}</p>
