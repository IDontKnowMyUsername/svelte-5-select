<script>
    import Select from '$lib/Select.svelte';

    let { form } = $props();

    const items = ['Foo', 'Bar'];
    let value = $state(null);
    let multiple = $state(false);
</script>

<label for="toggle"><input id="toggle" type="checkbox" bind:checked={multiple} />Multiple</label>

<form method="POST" action="?/someaction">
    <Select name="foobar" {multiple} required {items} bind:value />
    <button>Send</button>
</form>

{#if form?.success}
    <p>Data: {form?.foobar}</p>
{/if}