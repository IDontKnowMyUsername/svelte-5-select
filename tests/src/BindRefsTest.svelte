<script lang="ts">
    import Select from '$lib/Select.svelte';

    const items = [
        { value: 'chocolate', label: 'Chocolate' },
        { value: 'pizza', label: 'Pizza' },
    ];

    let container = $state<HTMLDivElement | undefined>();
    let input = $state<HTMLInputElement | undefined>();
</script>

<Select {items} bind:container bind:input />

<p data-testid="bound-container-tag">{container?.tagName ?? 'unbound'}</p>
<p data-testid="bound-input-tag">{input?.tagName ?? 'unbound'}</p>
