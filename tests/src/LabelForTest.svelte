<script lang="ts">
    import Select from '$lib/Select.svelte';

    interface Props {
        labelId?: string;
    }

    let { labelId }: Props = $props();

    const items = ['One', 'Two', 'Three'];
</script>

<label for="food-select" id={labelId}>Favourite food</label>
<Select id="food-select" {items} listOpen />
