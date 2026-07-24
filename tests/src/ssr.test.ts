// @vitest-environment node
//
// The one server-side pin in the suite: everything else runs in happy-dom, so a
// module-scope `document`/`window` access sneaking into the component would
// ship green while breaking every SvelteKit consumer's server render
// (14th audit: nothing exercised SSR at all).
import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import Select from '$lib/Select.svelte';

describe('SSR', () => {
    it('server-renders markup without browser globals', () => {
        const { body } = render(Select, {
            props: { items: [{ value: 'a', label: 'A' }], ariaLabel: 'Food' },
        });

        expect(body).toContain('svelte-select');
        expect(body).toContain('aria-label="Food"');
    });

    it('server-renders a selection and an open list', () => {
        const items = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
        ];
        const { body } = render(Select, {
            props: { items, value: items[0], listOpen: true, ariaLabel: 'Food' },
        });

        expect(body).toContain('selected-item');
        // The open listbox itself must be in the server HTML — asserting only
        // the selection would pass even if the list silently failed to SSR
        expect(body).toContain('role="listbox"');
        expect(body).toContain('role="option"');
        expect(body).toContain('>B');
    });
});
