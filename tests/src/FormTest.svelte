<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { JustValue, SelectItem } from '$lib/types';

    let {
        items,
        name,
        multiple = false,
        useJustValue = false,
        value = $bindable(undefined),
        justValue = $bindable(undefined),
    }: {
        items: SelectItem[] | string[];
        name: string;
        multiple?: boolean;
        useJustValue?: boolean;
        value?: SelectItem | SelectItem[] | string | null;
        justValue?: JustValue;
    } = $props();
</script>

<form>
    <Select {items} {name} {multiple} {useJustValue} bind:value bind:justValue />
</form>
