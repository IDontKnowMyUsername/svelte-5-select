<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = $state(['one', 'two']);
    let value = $state(['one']);
</script>

<Select multiple bind:items bind:value listOpen containerStyles="--multi-item-color: red" />