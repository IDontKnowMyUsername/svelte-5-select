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

const beer: string = 'Beer';
const juice: string = 'Juice';
const liquor: string = 'Liquor';

describe('Load dependency behavior with strings/JSON', () => {
    afterEach(() => cleanup());

    it('Both lists as strings', async () => {
        const { container } = render(BothListsAsStringsTest);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item')).find((el) =>
            el.textContent?.includes(drinks),
        ) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item')).map((el) => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });

    it('First list as strings', async () => {
        const { container } = render(FirstListAsStringsTest);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item')).find((el) =>
            el.textContent?.includes(drinks),
        ) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item')).map((el) => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });

    it('Second list as strings', async () => {
        const { container } = render(SecondListAsStringsTest);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item')).find((el) =>
            el.textContent?.includes(drinks),
        ) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item')).map((el) => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });

    it('Both lists as JSON', async () => {
        const { container } = render(BothListsAsJsonTest);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item')).find((el) =>
            el.textContent?.includes(drinks),
        ) as HTMLElement;

        await elementClick(drinksOption);

        await waitFor(() => {
            expect(categorySelect.textContent).toContain(drinks);
        });

        // Open second select and verify items loaded
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item')).map((el) => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });
    });
});

describe('Load dependency behavior with strings/JSON and justValue', () => {
    afterEach(() => cleanup());

    // Unlike the value-based tests above, these fixtures wire the chain through
    // bind:justValue (useJustValue) and surface both bound values in the DOM, so
    // the assertions pin that justValue itself carries the raw id — 14th audit:
    // these tests were byte-identical to the value-based ones and never read
    // justValue, so a justValue-sync bug in dependent-select flows passed.
    async function runJustValueFlow(
        fixture: unknown,
        expectedCategoryJustValue: string,
        expectedItemJustValue: string,
    ) {
        const { container } = render(fixture as Parameters<typeof render>[0]);

        const selects = container.querySelectorAll('.svelte-select');
        const categorySelect = selects[0] as HTMLElement;
        const itemsSelect = selects[1] as HTMLElement;
        const readout = (id: string) => container.querySelector(`[data-testid="${id}"]`)!.textContent;

        await elementClick(categorySelect, true);

        await waitFor(() => {
            expect(container.querySelectorAll('.list-item').length).toBeGreaterThan(0);
        });

        const drinksOption = Array.from(container.querySelectorAll('.list-item')).find((el) =>
            el.textContent?.includes(drinks),
        ) as HTMLElement;

        await elementClick(drinksOption);

        // The bound justValue is the raw id, not a wrapped item
        await waitFor(() => {
            expect(readout('category-justvalue')).toBe(expectedCategoryJustValue);
        });

        // Open the dependent select and pick from the loaded options
        await elementClick(itemsSelect, true);

        await waitFor(() => {
            const items = Array.from(itemsSelect.querySelectorAll('.list-item')).map((el) => el.textContent);
            expect(items).toContain(beer);
            expect(items).toContain(juice);
            expect(items).toContain(liquor);
        });

        const beerOption = Array.from(itemsSelect.querySelectorAll('.list-item')).find((el) =>
            el.textContent?.includes(beer),
        ) as HTMLElement;
        await elementClick(beerOption);

        await waitFor(() => {
            expect(readout('item-justvalue')).toBe(expectedItemJustValue);
        });
    }

    it('Both lists as strings', async () => {
        await runJustValueFlow(BothListsAsStringsTestJustValue, drinks, beer);
    });

    it('First list as string', async () => {
        // The dependent list is JSON items, so justValue is the item's value id
        await runJustValueFlow(FirstListAsStringsTestJustValue, drinks, 'B');
    });

    it('Second list as string', async () => {
        // The category list is JSON with numeric ids, so justValue renders '1'
        await runJustValueFlow(SecondListAsStringsTestJustValue, '1', beer);
    });
});
