<script lang="ts">
    import Select from '$lib/Select.svelte';
    import type { SelectItem } from '$lib';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function loadOptions(filterText: string): Promise<SelectItem[]> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(JSON.parse(JSON.stringify(items)));
            }, 1000);
        });
    }

    function handle(response: SelectItem[]) {
        console.log('This is loaded response ✅:', $state.snapshot(response));
    }
</script>

<Select onloaded={handle} {loadOptions} />
