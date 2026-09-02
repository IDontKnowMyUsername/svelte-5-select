<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib/types';

    let {
        items = [],
        onCreate = () => {},
        onPin = () => {},
        listOpen = $bindable(false),
        hoverItemIndex = $bindable(0),
        focused = $bindable(false),
    }: {
        items?: SelectItem[] | string[];
        onCreate?: () => void;
        onPin?: () => void;
        listOpen?: boolean;
        hoverItemIndex?: number;
        focused?: boolean;
    } = $props();
</script>

<!-- Interactive content in every non-option region of the popup: a pinned
     action above the options, a "create" action below them, and a "create"
     action in the empty state. -->
<Select {items} bind:listOpen bind:hoverItemIndex bind:focused>
    {#snippet listPrependSnippet()}
        <button type="button" class="pin-action" onclick={onPin}>Pinned action</button>
    {/snippet}
    {#snippet emptySnippet()}
        <div class="custom-empty">
            No matches. <button type="button" class="create-action" onclick={onCreate}>Create it</button>
        </div>
    {/snippet}
    {#snippet listAppendSnippet()}
        <button type="button" class="create-action" onclick={onCreate}>Create new</button>
        <button type="button" class="import-action">Import…</button>
    {/snippet}
</Select>
