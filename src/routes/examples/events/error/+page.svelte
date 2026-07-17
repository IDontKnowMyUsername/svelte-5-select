<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem, SelectErrorEvent } from '$lib';

    function loadOptions(): Promise<SelectItem[]> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject('💩');
            });
        });
    }

    function handle(error: SelectErrorEvent) {
        console.log('Load data Error ❌ ', error);
    }
</script>

<Select onerror={handle} {loadOptions} />
