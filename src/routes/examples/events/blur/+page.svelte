<script lang="ts">
    import { Select } from '$lib';

    let items = [
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
        { value: 'three', label: 'Three' },
    ];

    function handle(event: FocusEvent) {
        console.log('You blur the svelte select 😶‍🌫️', event);
    }
</script>

<Select {items} onblur={handle} searchable={false} />

<br />

<Select {items} onblur={handle} multiple />
