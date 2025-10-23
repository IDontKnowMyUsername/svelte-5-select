<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = ['One', 'Two', 'Three'];

    let collection = [
        { value: 'oneCollection', label: 'One From Collection' },
        { value: 'twoCollection', label: 'Two From Collection' },
        { value: 'threeCollection', label: 'Three From Collection' },
    ];
</script>

<Select {items} />
<br />
<Select items={collection} />
