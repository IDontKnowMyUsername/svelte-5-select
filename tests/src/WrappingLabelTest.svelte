<script lang="ts">
    import Select from '$lib/Select.svelte';

    const items = ['One', 'Two', 'Three'];
</script>

<!-- Implicit association: the label wraps the component, no for/id pair -->
<label>
    Favourite food
    <Select {items} listOpen />
</label>
