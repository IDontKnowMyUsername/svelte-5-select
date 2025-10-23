<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];
</script>

<p>using <code>requiredSnippet</code></p>
<p>parameter <code>-</code></p>
<Select {items} required>
    {#snippet requiredSnippet()}
        <div class="required">REQUIRED</div>
    {/snippet}
</Select>

<style>
    .required {
        color: red;
        position: absolute;
        height: 40px;
        line-height: 40px;
        right: 0;
        border: 1px solid;
        padding: 0 15px;
        background: #fff;
    }
</style>
