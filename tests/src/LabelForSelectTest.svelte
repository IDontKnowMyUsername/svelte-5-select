<script lang="ts">
    import Select from '$lib/Select.svelte';
    let { items } = $props();
</script>

<label for="labelled-select">Choose</label>
<Select {items} id="labelled-select" />
