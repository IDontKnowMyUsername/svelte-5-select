<script lang="ts">
    import Select from '$lib/Select.svelte';

    let { loadOptions, debounceWait = 100 } = $props();
    let listOpen = $state(false);
</script>

<!-- Drives listOpen the way a real parent binding would — an external write
     that never goes through the component's own closeList() -->
<button type="button" data-testid="close-list" onclick={() => (listOpen = false)}>close</button>

<Select {loadOptions} {debounceWait} bind:listOpen />
