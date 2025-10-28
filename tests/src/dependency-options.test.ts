import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/svelte';
import BothListsAsStringsTest from './load-dependencies/BothListsAsStringsTest.svelte';
import FirstListAsStringsTest from './load-dependencies/FirstListAsStringsTest.svelte';
import SecondListAsStringsTest from './load-dependencies/SecondListAsStringsTest.svelte';
import BothListsAsJsonTest from './load-dependencies/BothListsAsJsonTest.svelte';
import BothListsAsStringsTestJustValue from './load-dependencies/BothListsAsStringsTestJustValue.svelte';
import FirstListAsStringsTestJustValue from './load-dependencies/FirstListAsStringsTestJustValue.svelte';
import SecondListAsStringsTestJustValue from './load-dependencies/SecondListAsStringsTestJustValue.svelte';

async function elementClick(element: HTMLElement, usePointerUp = false): Promise<void> {
    if (usePointerUp) {
        const event = new PointerEvent('pointerup', { bubbles: true });
        element.dispatchEvent(event);
    } else {
        element.click();
    }
}
const drinks: string = 'Drinks';
const food: string = 'Food';

const beer: string = 'Beer';
const juice: string = 'Juice';
const liquor: string = 'Liquor';

const fries: string = 'Fries';
const hamburger: string = 'Hamburger';
const pizza: string = 'Pizza';

describe('Load dependency behavior with strings/JSON', () => {
    afterEach(() => cleanup());

    it('Both lists as strings', async() => {
        const { container } = render(BothListsAsStringsTest);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item'))
            .find(el => el.textContent?.includes(drinks)) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item'))
                .map(el => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });

    it('First list as strings', async() => {
        const { container } = render(FirstListAsStringsTest);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item'))
            .find(el => el.textContent?.includes(drinks)) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item'))
                .map(el => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });

    it('Second list as strings', async() => {
        const { container } = render(SecondListAsStringsTest);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item'))
            .find(el => el.textContent?.includes(drinks)) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item'))
                .map(el => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });

    it('Both lists as JSON', async() => {
        const { container } = render(BothListsAsJsonTest);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item'))
            .find(el => el.textContent?.includes(drinks)) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item'))
                .map(el => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });
});

describe('Load dependency behavior with strings/JSON and justValue', () => {
    afterEach(() => cleanup());

    it('Both lists as strings', async() => {
        const { container } = render(BothListsAsStringsTestJustValue);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item'))
            .find(el => el.textContent?.includes(drinks)) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item'))
                .map(el => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });

    it('First list as string', async() => {
        const { container } = render(FirstListAsStringsTestJustValue);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item'))
            .find(el => el.textContent?.includes(drinks)) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item'))
                .map(el => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });

    it('Second list as string', async() => {
        const { container } = render(SecondListAsStringsTestJustValue);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item'))
            .find(el => el.textContent?.includes(drinks)) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item'))
                .map(el => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });
});