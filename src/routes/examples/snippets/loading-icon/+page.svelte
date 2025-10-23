<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>loadingIconSnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items} loading>
    {#snippet loadingIconSnippet()}
        <div>⭐</div>
    {/snippet}
</Select>

<style>
    div {
        animation: rotate 0.75s linear infinite;
        transform-origin: center center;
        transform: none;
    }

    @keyframes rotate {
        100% {
            transform: rotate(360deg);
        }
    }
</style>
