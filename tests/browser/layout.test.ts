import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import Select from '$lib/Select.svelte';

const items = Array.from({ length: 20 }, (_, i) => ({ value: `item-${i}`, label: `Item ${i}` }));
const fewItems = items.slice(0, 5);

// Floating-ui positions asynchronously; give it a beat to settle
async function settle(ms = 60) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, ms));
    await tick();
}

describe('layout in a real browser', () => {
    afterEach(() => cleanup());

    it('positions the list below the input by default', async () => {
        render(Select, { props: { items: fewItems, listOpen: true } });
        await settle();

        const container = document.querySelector('.svelte-select')!.getBoundingClientRect();
        const list = document.querySelector('.svelte-select-list')!.getBoundingClientRect();
        expect(list.top).toBeGreaterThanOrEqual(container.bottom);
    });

    it('positions the list above the input when placement is top', async () => {
        render(Select, {
            props: {
                items: fewItems,
                listOpen: true,
                containerStyles: 'margin-top: 400px;',
                floatingConfig: { placement: 'top-start' },
            },
        });
        await settle();

        const container = document.querySelector('.svelte-select')!.getBoundingClientRect();
        const list = document.querySelector('.svelte-select-list')!.getBoundingClientRect();
        expect(list.bottom).toBeLessThanOrEqual(container.top);
    });

    it('offsets the list from the input by listOffset', async () => {
        render(Select, { props: { items: fewItems, listOpen: true, listOffset: 20 } });
        await settle();

        const container = document.querySelector('.svelte-select')!.getBoundingClientRect();
        const list = document.querySelector('.svelte-select-list')!.getBoundingClientRect();
        expect(Math.abs(list.top - container.bottom - 20)).toBeLessThanOrEqual(1);
    });

    it('keeps the list the width of the container', async () => {
        render(Select, {
            props: { items: fewItems, listOpen: true, containerStyles: 'width: 313px;' },
        });
        await settle();

        const container = document.querySelector('.svelte-select')!.getBoundingClientRect();
        const list = document.querySelector('.svelte-select-list')!.getBoundingClientRect();
        expect(Math.round(list.width)).toBe(Math.round(container.width));
    });

    it('scrolls the selected item into view when the list opens', async () => {
        render(Select, { props: { items, value: items[15], listOpen: true } });
        await settle();

        const list = document.querySelector('.svelte-select-list') as HTMLElement;
        expect(list.scrollHeight).toBeGreaterThan(list.clientHeight); // sanity: the list overflows

        const active = list.querySelector('.list-item .active') as HTMLElement;
        expect(active).toBeTruthy();
        const listRect = list.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        expect(activeRect.bottom).toBeLessThanOrEqual(listRect.bottom + 1);
        expect(activeRect.top).toBeGreaterThanOrEqual(listRect.top - 1);
    });

    it('keeps the hovered item visible while navigating with the keyboard', async () => {
        render(Select, { props: { items, listOpen: true, focused: true } });
        await settle();

        const list = document.querySelector('.svelte-select-list') as HTMLElement;
        const count = document.querySelectorAll('.list-item').length;
        expect(list.scrollHeight).toBeGreaterThan(list.clientHeight); // sanity: the list overflows

        for (let i = 1; i < count; i++) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            await settle(20);

            const hovered = list.querySelector('.list-item .hover') as HTMLElement;
            expect(hovered, `no hovered item at step ${i}`).toBeTruthy();
            const listRect = list.getBoundingClientRect();
            const hoveredRect = hovered.getBoundingClientRect();
            expect(hoveredRect.bottom, `item ${i} below the fold`).toBeLessThanOrEqual(listRect.bottom + 1);
            expect(hoveredRect.top, `item ${i} above the fold`).toBeGreaterThanOrEqual(listRect.top - 1);
        }
    });
});
