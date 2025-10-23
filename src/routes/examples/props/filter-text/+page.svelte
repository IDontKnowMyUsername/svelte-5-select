<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    let filterText = $state<string>('');
</script>

<p>{filterText}</p>
<Select {items} bind:filterText />
