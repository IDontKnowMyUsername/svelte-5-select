<script>
    import Select from '$lib/Select.svelte';

    let { form } = $props();

    let value = $state();
    let items = ['pizza', 'crisps', 'ice-cream'];
</script>

<p>using <code>inputHiddenSnippet</code></p>
<p>parameter <code>value</code></p>
<form method="POST" action="?/someaction">
    <Select {items} bind:value>
        {#snippet inputHiddenSnippet(value)}
            <input type="hidden" name="demo" {...value} />
        {/snippet}
    </Select>

    <button>Send</button>
</form>

{#if form?.success}
    <p>Data: {form?.demo}</p>
{/if}
