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

    // String values are resolved to items by useValue's normalization, which
    // historically only ran in a client effect — the server HTML shipped raw
    // strings: empty chip text, aria-label="Remove undefined", and the hidden
    // form input carrying JSON.stringify('NY') === '"NY"' (15th audit)
    it('server-renders multi chips from raw string values', () => {
        const { body } = render(Select, {
            props: {
                multiple: true,
                name: 'cities',
                items: [
                    { value: 'NY', label: 'New York' },
                    { value: 'LA', label: 'Los Angeles' },
                ],
                value: ['NY', 'LA'],
            },
        });

        expect(body).toContain('New York');
        expect(body).toContain('Los Angeles');
        expect(body).toContain('Remove New York');
        expect(body).not.toContain('undefined');
        // The hidden form input carries item JSON, not a JSON-quoted string
        expect(body).toContain('&quot;value&quot;');
    });

    it('server-renders a single string value under custom itemId/label keys', () => {
        const { body } = render(Select, {
            props: {
                items: [{ id: 'NY', name: 'New York' }],
                itemId: 'id',
                label: 'name',
                value: 'NY',
            },
        });

        expect(body).toContain('New York');
    });
});
