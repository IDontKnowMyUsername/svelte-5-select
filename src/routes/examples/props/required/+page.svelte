<script lang="ts">
    import Select from '$lib/Select.svelte';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        console.log('Form submitted!');
        // Your form logic here
    }
</script>

<form onsubmit={handleSubmit}>
    <Select {items} required />
    <button type="submit">Submit</button>
</form>