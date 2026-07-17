<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { JustValue, SelectItem } from '$lib';

    interface Props {
        onValueChange?: (value: unknown) => void;
    }

    let { onValueChange }: Props = $props();

    const items: SelectItem[] = [
        { value: 'chocolate', label: 'Chocolate' },
        { value: 'pizza', label: 'Pizza' },
    ];

    // The consumer scenario from the 7th audit: a parent mutates its bound
    // value array in place instead of assigning a new one
    let value = $state<SelectItem[]>([{ value: 'chocolate', label: 'Chocolate' }]);
    let justValue = $state<JustValue>();
</script>

<Select multiple {items} bind:value bind:justValue {onValueChange} />

<button data-testid="push-value" onclick={() => value.push(items[1])}>push</button>
<!-- 9th audit: index assignment changes no length, so it needs entry tracking -->
<button data-testid="assign-value" onclick={() => (value[0] = items[1])}>assign</button>
<div data-testid="just-value">{JSON.stringify(justValue)}</div>
