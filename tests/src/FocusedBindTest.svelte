<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let {
        items = [] as SelectItem[],
        focused = $bindable(false),
        listOpen = $bindable(false),
        disabled = $bindable(false),
    } = $props();
</script>

<!-- Buttons drive `focused`/`disabled` the way a real parent would through
     bindings, without moving DOM focus themselves (element.click() does not focus) -->
<button type="button" data-testid="set-focused" onclick={() => (focused = true)}>focus</button>
<button type="button" data-testid="set-unfocused" onclick={() => (focused = false)}>blur</button>
<button type="button" data-testid="set-disabled" onclick={() => (disabled = true)}>disable</button>

<Select {items} {disabled} bind:focused bind:listOpen />
