<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = ['One', 'Two', 'Three'];
    let listOpen = $state(false);
</script>

<Select
    bind:listOpen
    {items}
    listOffset={0}
    --list-border-radius="0 0 30px 30px"
    --item-first-border-radius="0"
    --border-radius={listOpen ? '30px 30px 0 0' : '5px'} />
