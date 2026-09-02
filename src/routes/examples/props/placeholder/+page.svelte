<script lang="ts">
    import { Select } from '$lib';

    let collection = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<Select items={collection} placeholder="foo" />
