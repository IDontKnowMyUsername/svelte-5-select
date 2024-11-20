<script>
    import Select from '$lib/Select.svelte';

    function loadOptions() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject('💩');
            });
        });
    }

    function handle(error) {
        console.log('Load data Error ❌ ', error);
    }
</script>

<Select onerror={handle} {loadOptions} />
