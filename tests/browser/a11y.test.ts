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
        const list = document.querySelector('[role="listbox"]');
        expect(list!.getAttribute('aria-labelledby')).toBe('food-label');
        await expectNoViolations();
    });

    // 14th audit: the chip-as-button path (role="button" chips with composed
    // remove labels, Enter/Space removal, focus ring) was never rendered under
    // axe — only pinned in jsdom unit tests.
    it('multiFullItemClearable chips pass the scan', async () => {
        render(Select, {
            props: {
                items,
                ariaLabel: 'Food',
                multiple: true,
                multiFullItemClearable: true,
                value: [items[0], items[1]],
                focused: true,
            },
        });
        await settle();
        await expectNoViolations();
    });

    // 14th audit: these states were never scanned either — select-only swaps
    // the whole interaction pattern, and hasError/loading each restyle the
    // control (error border, loading copy) in ways axe can judge.
    it('select-only mode (searchable={false}) passes the scan', async () => {
        render(Select, {
            props: { items, ariaLabel: 'Food', searchable: false, value: items[0], listOpen: true, focused: true },
        });
        await settle();
        await expectNoViolations();
    });

    it('hasError and loading states pass the scan', async () => {
        const { unmount } = render(Select, { props: { items, ariaLabel: 'Food', hasError: true } });
        await settle();
        await expectNoViolations();
        unmount();

        render(Select, { props: { items, ariaLabel: 'Food', loading: true, listOpen: true } });
        await settle();
        await expectNoViolations();
    });

    // Forced-colors rendering cannot be emulated here, so pin the rules
    // structurally. Substring match: default.css is @imported into
    // Select.svelte's style block, so Svelte appends its scoping class to
    // every selector.
    function findForcedColorsRules(selector: string): CSSStyleRule[] {
        const matches: CSSStyleRule[] = [];
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
                        if (inner instanceof CSSStyleRule && inner.selectorText.includes(selector)) matches.push(inner);
                    }
                }
            }
        }
        return matches;
    }

    it('forced-colors keeps the arrow-key tag cursor distinguishable without colour', () => {
        // Every chip carries a 1px outline and .multi-item.active differs only
        // by outline colour, which the forced palette flattens — the Backspace
        // target vanished under Windows High Contrast (12th audit). The theme
        // must distinguish the cursor by width + style, not colour.
        const rule = findForcedColorsRules('.multi-item.active').at(-1);
        expect(rule, 'expected a forced-colors rule for .multi-item.active').toBeTruthy();
        expect(rule!.style.outlineStyle).toBe('dashed');
        expect(rule!.style.outlineWidth).toBe('2px');
    });

    it('forced-colors keeps the error and disabled states visible without colour', () => {
        // hasError was conveyed only by an author border colour and disabled by
        // author greys — both flattened to the standard palette under Windows
        // High Contrast (14th audit). Border style survives for error; GrayText
        // is the system colour for disabled.
        const error = findForcedColorsRules('.svelte-select.error').at(-1);
        expect(error, 'expected a forced-colors rule for .svelte-select.error').toBeTruthy();
        expect(error!.style.borderStyle).toBe('double');

        const disabledStyles = findForcedColorsRules('.disabled').map((r) => r.style);
        expect(disabledStyles.length, 'expected forced-colors rules for .disabled').toBeGreaterThan(0);
        expect(disabledStyles.some((s) => s.color.toLowerCase() === 'graytext')).toBe(true);
        expect(disabledStyles.some((s) => s.borderColor.toLowerCase() === 'graytext')).toBe(true);
    });
});
