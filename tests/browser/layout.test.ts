import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { userEvent } from '@vitest/browser/context';
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

    it('the open list settles visible and clickable (prefloat cleared)', async () => {
        // 8th audit: the anti-flicker .prefloat class (opacity 0, pointer-events
        // none) is cleared by a timeout after positioning. If that regressed,
        // the open list would be permanently invisible for real users while
        // every jsdom query, getBoundingClientRect assertion, and synthetic
        // .click() in the suite still passed — nothing else pins visibility.
        render(Select, { props: { items: fewItems, listOpen: true } });
        await settle();

        const list = document.querySelector('.svelte-select-list') as HTMLElement;
        expect(list.classList.contains('prefloat')).toBe(false);
        const style = getComputedStyle(list);
        expect(style.opacity).toBe('1');
        expect(style.pointerEvents).not.toBe('none');
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

    // Ported from a perma-skipped happy-dom test (no layout engine there)
    it('truncates an overflowing item label with an ellipsis', async () => {
        const longest = `${'super '.repeat(30)}loooooonnnng name`;
        render(Select, {
            props: {
                listOpen: true,
                containerStyles: 'width: 300px;',
                items: [
                    { value: 'long', label: longest },
                    { value: 'short', label: 'Not so long' },
                ],
            },
        });
        await settle();

        const first = document.querySelector('.list-item:first-child .item') as HTMLElement;
        const last = document.querySelector('.list-item:last-child .item') as HTMLElement;

        // The long label overflows its box while the short one fits...
        expect(first.scrollWidth).toBeGreaterThan(first.clientWidth);
        expect(last.scrollWidth).toBe(last.clientWidth);
        // ...and the overflow renders as an ellipsis, not clipped or wrapped text
        const style = getComputedStyle(first);
        expect(style.textOverflow).toBe('ellipsis');
        expect(style.whiteSpace).toBe('nowrap');
        expect(style.overflow).toBe('hidden');
    });

    // Ported from a perma-skipped happy-dom test (no layout engine there)
    it('grows the control height when multi tags wrap', async () => {
        const props = {
            multiple: true,
            items: fewItems,
            containerStyles: 'max-width: 200px;',
        };
        const { rerender } = render(Select, { props });
        await settle();

        const before = (document.querySelector('.svelte-select') as HTMLElement).getBoundingClientRect().height;

        await rerender({
            ...props,
            value: [
                { value: 'a', label: 'Chocolate Fudge Brownie' },
                { value: 'b', label: 'Strawberry Cheesecake Supreme' },
            ],
        });
        await settle();

        const after = (document.querySelector('.svelte-select') as HTMLElement).getBoundingClientRect().height;
        expect(document.querySelectorAll('.multi-item').length).toBe(2);
        expect(after).toBeGreaterThan(before);
    });

    // 10th audit: real browsers move focus on mousedown, so a press on a
    // non-input surface (chevron area, chips, multi whitespace) blurred the
    // input — blur closed the list, and the press's own bubbled pointerup
    // re-toggled it straight back open, making those surfaces unable to close
    // the dropdown. jsdom cannot reproduce the blur, so this needs real events.
    it('clicking the chevron area closes an open list and keeps it closed', async () => {
        render(Select, { props: { items: fewItems, showChevron: true, multiple: true } });
        await settle();

        await userEvent.click(document.querySelector('input[type="text"]') as HTMLElement);
        await settle();
        expect(document.querySelector('.svelte-select-list')).toBeTruthy();

        // .chevron is pointer-events: none, so the hit lands on .indicators
        await userEvent.click(document.querySelector('.indicators') as HTMLElement);
        await settle();
        expect(document.querySelector('.svelte-select-list')).toBeFalsy();
    });
});
