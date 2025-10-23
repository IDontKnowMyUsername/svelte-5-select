<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(event: FocusEvent) {
        console.log('You focusing svelte select 🧐', event);
    }
</script>

<Select {items} onfocus={handle} />
