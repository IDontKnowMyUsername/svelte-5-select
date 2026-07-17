import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import axe from 'axe-core';
import Select from '$lib/Select.svelte';
import type { ItemLike } from '$lib';
// Compiled by @tailwindcss/vite (see vitest.browser.config.ts); ?inline returns
// the CSS text without injecting it, so we control exactly which theme is live.
import tailwindTheme from '../../src/lib/tailwind.css?inline';

const items = [
    { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
    { value: 'pizza', label: 'Pizza', group: 'Savory' },
    { value: 'cake', label: 'Cake', group: 'Sweet' },
    { value: 'chips', label: 'Chips', group: 'Savory' },
    { value: 'sold-out', label: 'Sold out', group: 'Savory', selectable: false },
];

async function settle(ms = 60) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, ms));
    await tick();
}

// Same WCAG A/AA scope and self-diagnosing output as a11y.test.ts, but scoped
// to the rendered container: with the harness styles disabled below, the
// surrounding vitest UI is not representative of anything a consumer ships.
async function expectNoViolations(context: Element) {
    const results = await axe.run(context, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
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

// The shipped Tailwind theme (src/lib/tailwind.css) targets the no-styles
// component variant, so the default theme Select.svelte imports must not be in
// the cascade: disable every stylesheet the page loaded and inject only the
// compiled Tailwind theme. This suite exists because the 8th audit found two
// default.css a11y fixes that were never mirrored here (group-title contrast,
// arrow-key tag cursor) — axe scanned only the default theme.
beforeAll(() => {
    if (tailwindTheme.includes('@apply')) {
        throw new Error('tailwind.css was not compiled — @tailwindcss/vite is not processing the ?inline import');
    }
    for (const sheet of Array.from(document.styleSheets)) sheet.disabled = true;
    const style = document.createElement('style');
    style.setAttribute('data-theme', 'tailwind');
    style.textContent = tailwindTheme;
    document.head.append(style);
});

describe('tailwind theme — axe scan (WCAG A/AA)', () => {
    afterEach(() => cleanup());

    it('open grouped list keeps group titles readable', async () => {
        const { container } = render(Select, {
            props: {
                items,
                ariaLabel: 'Food',
                listOpen: true,
                groupBy: (item: ItemLike) => String(item.group),
            },
        });
        await settle();
        // Direct pin for the 8th-audit bug: .item.not-selectable used to
        // out-cascade the group-title color, so headers rendered in the same
        // dim grey as disabled options. (Tailwind v4 computes to oklch(), so
        // compare against the theme's own colors rather than an rgb literal.)
        const title = document.querySelector('.list-group-title') as HTMLElement;
        const disabledOption = document.querySelector('.item.not-selectable:not(.list-group-title)') as HTMLElement;
        expect(getComputedStyle(title).color).not.toBe(getComputedStyle(disabledOption).color);
        await expectNoViolations(container);
    });

    it('placeholder text is not preflight-faded', async () => {
        const { container } = render(Select, {
            props: { items, ariaLabel: 'Food', placeholder: 'Please select' },
        });
        await settle();
        // Direct pin for the 9th-audit bug: the theme styled only the DISABLED
        // placeholder, so the enabled prompt fell through to Tailwind v4
        // preflight's ::placeholder — color-mix(currentColor 50%, transparent),
        // ~2.3:1 on white (WCAG 1.4.3). axe cannot catch this (it does not
        // evaluate placeholder contrast), so pin the mechanism instead: the
        // computed placeholder color must be fully opaque. (Tailwind v4
        // computes to oklch()/oklab(), so assert on the alpha channel rather
        // than an rgb literal.)
        const input = document.querySelector('.svelte-select input') as HTMLInputElement;
        const color = getComputedStyle(input, '::placeholder').color;
        expect(color, `placeholder color "${color}" must not carry an alpha channel`).not.toMatch(
            /\/\s*0(\.\d+)?\)|rgba|hsla/,
        );
        await expectNoViolations(container);
    });

    it('open list with keyboard cursor, selection, and a disabled option', async () => {
        const { container } = render(Select, {
            props: { items, ariaLabel: 'Food', value: items[0], listOpen: true, focused: true },
        });
        await settle();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        await settle(20);
        // Disabled options must not paint the keyboard-cursor affordance
        const disabled = document.querySelector('.item.not-selectable') as HTMLElement;
        expect(getComputedStyle(disabled).outlineStyle).toBe('none');
        await expectNoViolations(container);
    });

    it('multi select shows a visible arrow-key tag cursor', async () => {
        const { container } = render(Select, {
            props: {
                items,
                ariaLabel: 'Food',
                multiple: true,
                value: [items[0], items[1]],
                focused: true,
            },
        });
        await settle();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        await settle(20);
        // Direct pin for the 8th-audit bug: the theme had no .multi-item.active
        // rule, so the Backspace target was invisible to sighted keyboard users.
        const active = document.querySelector('.multi-item.active') as HTMLElement;
        expect(active, 'ArrowLeft should park the tag cursor on the last chip').toBeTruthy();
        const style = getComputedStyle(active);
        expect(style.outlineStyle).not.toBe('none');
        expect(style.outlineWidth).not.toBe('0px');
        await expectNoViolations(container);
    });
});
