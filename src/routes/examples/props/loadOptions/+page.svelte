<script lang="ts">
    import Select from '$lib/Select.svelte';
    import Fuse from 'fuse.js';
    import type { SelectItem } from '$lib';

    let items = ['one', 'two', 'three', 'four', 'five'];

    async function handleOptions(filterText: string): Promise<SelectItem[] | string[]> {
        if (filterText.length === 0) return [...items];

        const fuse = new Fuse([...items]);

        return fuse.search(filterText).map(({ item }) => item);
    }
</script>

<p>
    <i><b><a href="https://www.fusejs.io/">fuse.js</a></b></i> &nbsp; will provide fuzzy searching (more formally known as
    approximate string matching)
</p>
<p>you can try type "on" the list will provide a "one" as first data but will approximate a string</p>
<p>then it will provide "four" and "two" in the list</p>

<Select loadOptions={handleOptions} debounceWait={0} />
