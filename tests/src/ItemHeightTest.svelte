<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
</script>

<Select bind:items listOpen containerStyles="--item-height: 50px" />