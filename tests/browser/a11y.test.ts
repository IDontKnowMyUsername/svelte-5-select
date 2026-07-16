import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import axe from 'axe-core';
import Select from '$lib/Select.svelte';

const items = [
    { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
    { value: 'pizza', label: 'Pizza', group: 'Savory' },
    { value: 'cake', label: 'Cake', group: 'Sweet' },
    { value: 'chips', label: 'Chips', group: 'Savory' },
    // A disabled option: aria-disabled exempts it from the contrast rule
    // (WCAG 1.4.3 inactive-component exception)
    { value: 'sold-out', label: 'Sold out', group: 'Savory', selectable: false },
];

// Floating-ui positions asynchronously; give it a beat to settle
async function settle(ms = 60) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, ms));
    await tick();
}

// WCAG A/AA rules only: best-practice rules (landmarks/region etc.) target
// page composition, which is the consumer's responsibility, not a component's.
async function expectNoViolations() {
    const results = await axe.run(document.body, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    const violations = results.violations.map(
        (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
    );
    expect(violations).toEqual([]);
}

describe('axe scan (WCAG A/AA)', () => {
    afterEach(() => cleanup());

    it('closed select with a selection', async () => {
        render(Select, { props: { items, ariaLabel: 'Food', value: items[0] } });
        await settle();
        await expectNoViolations();
    });

    it('open list with keyboard cursor and selection', async () => {
        render(Select, { props: { items, ariaLabel: 'Food', value: items[0], listOpen: true, focused: true } });
        await settle();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        await settle(20);
        await expectNoViolations();
    });

    it('open grouped list (role="group" wrapper regions)', async () => {
        render(Select, {
            props: {
                items,
                ariaLabel: 'Food',
                listOpen: true,
                groupBy: (item: { group: string }) => item.group,
            },
        });
        await settle();
        await expectNoViolations();
    });

    it('multi select with tags, tag-remove buttons, and the clear button', async () => {
        render(Select, {
            props: {
                items,
                ariaLabel: 'Food',
                multiple: true,
                value: [items[0], items[1]],
            },
        });
        await settle();
        await expectNoViolations();
    });

    it('open empty list announces its empty state', async () => {
        render(Select, { props: { items: [], ariaLabel: 'Food', listOpen: true } });
        await settle();
        await expectNoViolations();
    });

    it('disabled select keeps its value in the accessibility tree', async () => {
        render(Select, { props: { items, ariaLabel: 'Food', value: items[0], disabled: true } });
        await settle();
        await expectNoViolations();
    });
});
