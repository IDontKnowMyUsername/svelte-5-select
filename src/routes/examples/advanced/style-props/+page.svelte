<script>
    import Select from '$lib/Select.svelte';

    let items = ['One', 'Two', 'Three'];
    let listOpen = $state(false);
</script>

<Select
    bind:listOpen
    {items}
    listOffset={0}
    --list-border-radius="0 0 10px 10px"
    --item-first-border-radius="0"
    --border-radius={listOpen ? '10px 10px 0 0' : '5px'} />
