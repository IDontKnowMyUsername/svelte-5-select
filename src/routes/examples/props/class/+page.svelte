<script>
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
        { value: 'four', label: 'Four' },
        { value: 'five', label: 'Five' },
        { value: 'six', label: 'Six' },
        { value: 'seven', label: 'Seven' },
        { value: 'eight', label: 'Eight' },
        { value: 'nine', label: 'Nine' },
        { value: 'ten', label: 'Ten' },
        { value: 'eleven', label: 'Eleven' },
        { value: 'twelve', label: 'Twelve' },
    ];
</script>

<Select {items} class="foo bar" />

<style>
    :global(.foo) {
        background: pink !important;
    }
</style>
