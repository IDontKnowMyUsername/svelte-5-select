<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let {
        items = [] as SelectItem[],
        focused = $bindable(false),
        listOpen = $bindable(false),
        disabled = false,
    } = $props();
</script>

<!-- Buttons drive `focused` the way a real parent would through bind:focused,
     without moving DOM focus themselves (element.click() does not focus) -->
<button type="button" data-testid="set-focused" onclick={() => (focused = true)}>focus</button>
<button type="button" data-testid="set-unfocused" onclick={() => (focused = false)}>blur</button>

<Select {items} {disabled} bind:focused bind:listOpen />
