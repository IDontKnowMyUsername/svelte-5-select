<script lang="ts">
  import Select from '$lib/Select.svelte';

  let { value = $bindable(), items } = $props();
</script>

<div class="container">
  <Select bind:value {items}></Select>

  <p class="result">{value.label}</p>
</div>
