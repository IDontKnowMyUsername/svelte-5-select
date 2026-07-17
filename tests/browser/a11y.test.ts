import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import axe from 'axe-core';
import Select from '$lib/Select.svelte';
import LabelForTest from '../src/LabelForTest.svelte';
import type { ItemLike } from '$lib';

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
    // Verbose on purpose: CI-only failures must be diagnosable from the log
    // alone, so include axe's failure summary plus the rendered state of each
    // flagged element (class list and computed colors).
    const violations = results.violations.map((v) =>
        [
            `${v.id} (${v.impact}): ${v.help}`,
            ...v.nodes.map((n) => {
                const el = document.querySelector(n.target.join(' '));
                const rendered =
                    el instanceof HTMLElement
                        ? ` [class="${el.className}" color=${getComputedStyle(el).color} bg=${getComputedStyle(el).backgroundColor}]`
                        : '';
                return `  ${n.target.join(' ')}${rendered}: ${n.failureSummary?.replace(/\n\s*/g, ' ')}`;
            }),
        ].join('\n'),
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
                groupBy: (item: ItemLike) => String(item.group),
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

    // 10th audit: every scan above passes ariaLabel, which masked the other
    // recommended naming path — with only `id` + external `<label for>`, the
    // open listbox had no accessible name at all (the label names the input,
    // not the floating list).
    it('open list named via an external <label for> instead of ariaLabel', async () => {
        render(LabelForTest, { props: { labelId: 'food-label' } });
        await settle();
        const list = document.querySelector('.svelte-select-list');
        expect(list!.getAttribute('aria-labelledby')).toBe('food-label');
        await expectNoViolations();
    });

    it('forced-colors keeps the arrow-key tag cursor distinguishable without colour', () => {
        // Every chip carries a 1px outline and .multi-item.active differs only
        // by outline colour, which the forced palette flattens — the Backspace
        // target vanished under Windows High Contrast (12th audit). Forced
        // colors cannot be emulated here, so pin the rule structurally: the
        // theme must distinguish the cursor by width + style, not colour.
        // Substring match: default.css is @imported into Select.svelte's style
        // block, so Svelte appends its scoping class to every selector.
        let rule: CSSStyleRule | undefined;
        for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRuleList;
            try {
                rules = sheet.cssRules;
            } catch {
                continue;
            }
            for (const outer of Array.from(rules)) {
                if (outer instanceof CSSMediaRule && outer.conditionText.includes('forced-colors')) {
                    for (const inner of Array.from(outer.cssRules)) {
                        if (inner instanceof CSSStyleRule && inner.selectorText.includes('.multi-item.active'))
                            rule = inner;
                    }
                }
            }
        }
        expect(rule, 'expected a forced-colors rule for .multi-item.active').toBeTruthy();
        expect(rule!.style.outlineStyle).toBe('dashed');
        expect(rule!.style.outlineWidth).toBe('2px');
    });
});
