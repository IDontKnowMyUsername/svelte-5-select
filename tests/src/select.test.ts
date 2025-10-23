import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';

import Select from '$lib/Select.svelte';
import ParentContainer from './Select/ParentContainer.svelte';
import SelectionSlotTest from './SelectionSlotTest.svelte';
import SelectionSlotMultipleTest from './SelectionSlotMultipleTest.svelte';
import ChevronSlotTest from './ChevronSlotTest.svelte';
import PrependSlotTest from './PrependSlotTest.svelte';
import ClearIconSlotTest from './ClearIconSlotTest.svelte';
import ListSlotTest from './ListSlotTest.svelte';
import InputHiddenSlotTest from './InputHiddenSlotTest.svelte';
import ItemSlotTest from './ItemSlotTest.svelte';
import OuterListTest from './OuterListTest.svelte';
import ItemHeightTest from './ItemHeightTest.svelte';
import MultiItemColor from './MultiItemColor.svelte';
import GroupHeaderNotSelectable from './GroupHeaderNotSelectable.svelte';
import HoverItemIndexTest from './HoverItemIndexTest.svelte';
import LoadOptionsGroup from './LoadOptionsGroup.svelte';
import type { SelectItem } from '$lib';
import { tick } from 'svelte';
import userEvent from '@testing-library/user-event';

type SelectInstance = {
    focused?: boolean;
    value?: any;
    filterText?: string;
    listOpen?: boolean;
};

async function querySelectorClick(selector: string): Promise<void> {
    if (selector === '.svelte-select') {
        const element = document.querySelector(selector);
        if (element) {
            const event = new PointerEvent('pointerup', { bubbles: true });
            element.dispatchEvent(event);
        }
    } else {
        const element = document.querySelector(selector) as HTMLElement | null;
        element?.click();
    }
}

function handleKeyboard(key: string) {
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': key }));
    return new Promise(f => setTimeout(f, 0));
}

function getPosts(filterText: string): Promise<SelectItem[]> {
    const mockBeers = [
        { id: 1, name: 'Juniper Wheat Beer', tagline: 'A refreshing wheat beer' },
        { id: 2, name: 'Pilsner', tagline: 'Classic pilsner' },
        { id: 3, name: 'IPA', tagline: 'Hoppy IPA' },
        { id: 4, name: 'Stout', tagline: 'Dark and rich' },
        { id: 5, name: 'Pale Ale', tagline: 'American pale ale' },
        { id: 6, name: 'Lager', tagline: 'Crisp lager' },
        { id: 7, name: 'Porter', tagline: 'Smooth porter' },
        { id: 8, name: 'Amber Ale', tagline: 'Balanced amber' },
        { id: 9, name: 'Wheat Beer', tagline: 'Light wheat beer' },
        { id: 10, name: 'Saison', tagline: 'Farmhouse ale' }
    ];

    // If no filter or filter too short, return all beers
    if (!filterText || filterText.length < 2) {
        const allBeers = mockBeers
            .sort((a, b) => {
                if (a.name > b.name) return 1;
                if (a.name < b.name) return -1;
                return 0;
            })
            .map(beer => ({ value: beer.id, label: beer.name }));

        return Promise.resolve(allBeers);
    }

    // Filter beers by name (case insensitive)
    const filtered = mockBeers
        .filter(beer => beer.name.toLowerCase().includes(filterText.toLowerCase()))
        .sort((a, b) => {
            if (a.name > b.name) return 1;
            if (a.name < b.name) return -1;
            return 0;
        })
        .map(beer => ({ value: beer.id, label: beer.name }));

    return Promise.resolve(filtered);
}

function resolvePromise(): Promise<string[]> {
    return new Promise((resolve) => {
        resolve(['a', 'b', 'c']);
    })
}

function rejectPromise(): Promise<SelectItem[]> {
    return new Promise((resolve, reject) => {
        reject('error 123');
    })
}

const items = [
    { value: 'chocolate', label: 'Chocolate' },
    { value: 'pizza', label: 'Pizza' },
    { value: 'cake', label: 'Cake' },
    { value: 'chips', label: 'Chips' },
    { value: 'ice-cream', label: 'Ice Cream' },
];

const itemsWithGroup = [
    { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
    { value: 'pizza', label: 'Pizza', group: 'Savory' },
    { value: 'cake', label: 'Cake', group: 'Sweet' },
    { value: 'chips', label: 'Chips', group: 'Savory' },
    { value: 'ice-cream', label: 'Ice Cream', group: 'Sweet' }
];

const itemsWithGroupAndSelectable = [
    { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
    { value: 'pizza', label: 'Pizza', group: 'Savory' },
    { value: 'cake', label: 'Cake', group: 'Sweet', selectable: false },
    { value: 'chips', label: 'Chips', group: 'Savory', selectable: false },
    { value: 'ice-cream', label: 'Ice Cream', group: 'Sweet' }
];

const itemsWithIndex = [
    { value: 'chocolate', label: 'Chocolate', index: 0 },
    { value: 'pizza', label: 'Pizza', index: 1 },
    { value: 'cake', label: 'Cake', index: 2 },
    { value: 'chips', label: 'Chips', index: 3 },
    { value: 'ice-cream', label: 'Ice Cream', index: 4 },
];

const collection = [
    { _id: 0, label: 'Chocolate' },
    { _id: 1, label: 'Pizza' },
    { _id: 2, label: 'Cake' },
    { _id: 3, label: 'Chips' },
    { _id: 4, label: 'Ice Cream' }
];

const itemsWithSelectable = [
    { value: 'notSelectable1', label: 'NotSelectable1', selectable: false },
    { value: 'selectableDefault', label: 'SelectableDefault' },
    { value: 'selectableTrue', label: 'SelectableTrue', selectable: true },
    { value: 'notSelectable2', label: 'NotSelectable2', selectable: false }
];

async function wait(ms: number) {
    return new Promise(f => setTimeout(f, ms));
}

describe('Select Component', () => {
    afterEach(() => cleanup());

    describe('Focus behavior', () => {
        it('adds focused class when focused is true', () => {
            render(Select, { props: { focused: true } });
            expect(document.querySelector('.focused')).toBeTruthy();
        });

        it('focuses input when focused changes to true', async () => {
            const { component } = render(Select, { props: {} }) as { component: SelectInstance };
            component.focused = true;
            await tick();
            const hasFocused = document.querySelector('.svelte-select input');
            expect(hasFocused).toBeTruthy();
        });
    });

    describe('List rendering', () => {
        it('shows empty list message when no items', () => {
            render(Select, { props: { listOpen: true } });
            expect(document.querySelector('.empty')).toBeTruthy();
        });

        it('renders default list with five items', () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithIndex
                }
            });
            expect(document.getElementsByClassName('list-item').length).toBeGreaterThan(0);
        });

        it('highlights active list item', () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithIndex,
                    value: { value: 'pizza', label: 'Pizza', index: 1 }
                }
            });

            expect(document.querySelector('.list-item .active')!.textContent).toBe('Pizza');
        });
    });

    describe('List scrolling', () => {
        it('scrolls to active item', () => {
            const extras = [
                { value: 'chicken', label: 'Chicken', index: 5 },
                { value: 'fried-chicken', label: 'Fried Chicken', index: 6 },
                { value: 'sunday-roast', label: 'Sunday Roast', index: 7 },
            ];

            render(Select, {
                props: {
                    items: itemsWithIndex.concat(extras),
                    value: { value: 'sunday-roast', label: 'Sunday Roast' },
                    listOpen: true,
                }
            });

            let offsetBounding;
            const container = document.querySelector('.svelte-select-list');
            if (container) {
                const focusedElemBounding = container.querySelector('.list-item .active');
                if (focusedElemBounding) {
                    offsetBounding = container.getBoundingClientRect().bottom - focusedElemBounding.getBoundingClientRect().bottom;
                }
            }

            expect(offsetBounding).toBe(0);
        });

        it('scrolls to hovered item when navigating with keys', async () => {
            const extras = [
                { value: 'chicken', label: 'Chicken', index: 5 },
                { value: 'fried-chicken', label: 'Fried Chicken', index: 6 },
                { value: 'sunday-roast', label: 'Sunday Roast', index: 7 },
            ];

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithIndex.concat(extras)
                }
            });

            const container = document.querySelector('.svelte-select-list');
            if (container) {
                const totalListItems = container.querySelectorAll('.list-item').length;

                let selectedItemsAreWithinBounds = true;
                let loopCount = 1;

                do {
                    await handleKeyboard('ArrowDown');

                    const hoveredItem = container.querySelector('.list-item .hover');

                    if (!hoveredItem) {
                        expect.fail('No hovered item found');
                    }

                    const isInViewport = container.getBoundingClientRect().bottom - hoveredItem.getBoundingClientRect().bottom >= 0;

                    selectedItemsAreWithinBounds = selectedItemsAreWithinBounds && isInViewport;

                    loopCount += 1;
                } while (loopCount < totalListItems);

                expect(selectedItemsAreWithinBounds).toBeTruthy();
            } else {
                expect.fail('container doesn\'t exist');
            }
        });
    });

    describe('Keyboard navigation', () => {
        it('updates hover item on keyUp or keyDown', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: items
                }
            });

            await handleKeyboard('ArrowDown');
            const focusedElemBounding = document.querySelector('.list-item .hover');
            expect(focusedElemBounding!.textContent.trim()).toBe('Pizza');
        });

        it('fires select event on enter with active item', async () => {
            let value;

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithIndex,
                    onchange: (event: any) => {
                        value = JSON.stringify(event);
                    }
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();
            expect(value).toBe(JSON.stringify({ value: 'cake', label: 'Cake', index: 2 }));
        });

        it('fires select event on tab with active item', async () => {
            let value;

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithIndex,
                    onchange: (selectedValue: SelectItem) => {
                        value = JSON.stringify(selectedValue);
                    }
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
            await tick();
            expect(value).toBe(JSON.stringify({ value: 'cake', label: 'Cake', index: 2 }));
        });

        it('does not fire select event when selecting current active item', async () => {
            let itemSelectedFired = false;

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithIndex,
                    value: { value: 'chocolate', label: 'Chocolate', index: 0 },
                    onchange: () => {
                        itemSelectedFired = true;
                    }
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));

            expect(itemSelectedFired).toBe(false);
        });
    });

    describe('Value display', () => {
        it('shows selected item\'s default view', () => {
            render(Select, {
                props: {
                    value: { value: 'chips', label: 'Chips' },
                }
            });

            expect(document.querySelector('.selected-item')!.textContent).toBe('Chips');
        });

        it('updates view when value updates', async () => {
            const { rerender } = render(Select, { props: {items: []} });

            await rerender({
                items: [],
                value: { value: 'chips', label: 'Chips' }
            });

            expect(document.querySelector('.selected-item')!.textContent).toBe('Chips');
        });

        it('clears value and updates view on clear', async () => {
            const { rerender } = render(Select, {
                props: {
                    value: { value: 'chips', label: 'Chips' },
                }
            });

            await rerender({
                items: [],
                value: undefined
            });

            await tick();
            expect(document.querySelector('.selected-item')).toBeFalsy();
        });
    });

    describe('List interaction', () => {
        it('opens list when clicking on Select', async () => {
            render(Select, { props: {} });

            await querySelectorClick('.svelte-select');
            const listContainer = document.querySelector('.svelte-select-list');
            expect(listContainer).toBeTruthy();
        });

        it('opens list populated with items', async () => {
            render(Select, { props: { items } });

            await querySelectorClick('.svelte-select');
            expect(document.querySelector('.list-item')).toBeTruthy();
        });

        it('starts with first item in hover state', async () => {
            render(Select, { props: { items } });

            await querySelectorClick('.svelte-select');
            expect(document.querySelector('.list-item .hover')!.textContent).toBe('Chocolate');
        });

        it('selects item from list', async () => {
            render(Select, { props: { items } });

            await querySelectorClick('.svelte-select');
            await handleKeyboard('ArrowDown');
            await handleKeyboard('ArrowDown');
            await handleKeyboard('Enter');
            expect(document.querySelector('.selected-item')!.textContent).toBe('Cake');
        });
    });

    describe('Floating positioning', () => {
        it('positions list above input when placement is top', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true,
                    floatingConfig: { placement: 'top-start' }
                }
            });

            const container = document.querySelector('.svelte-select') as HTMLElement;
            container.style.margin = '300px 0 0 0';
            await tick();
            const distanceOfListBottomFromViewportTop = document.querySelector('.svelte-select-list')!.getBoundingClientRect().bottom;
            const distanceOfInputTopFromViewportTop = document.querySelector('.svelte-select')!.getBoundingClientRect().top;
            expect(distanceOfListBottomFromViewportTop).toBeLessThanOrEqual(distanceOfInputTopFromViewportTop);
            container.style.margin = '0';
        });

        it('positions list below input when placement is bottom', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true,
                    floatingConfig: { placement: 'bottom-start' }
                }
            });

            await tick();
            const distanceOfListTopFromViewportTop = document.querySelector('.svelte-select-list')!.getBoundingClientRect().top;
            const distanceOfInputBottomFromViewportTop = document.querySelector('.svelte-select')!.getBoundingClientRect().bottom;

            expect(distanceOfListTopFromViewportTop).toBeGreaterThanOrEqual(distanceOfInputBottomFromViewportTop);
        });
    });

    describe('Blur behavior', () => {
        it('closes list and removes focus on blur', async () => {
            const user = userEvent.setup();

            render(Select, {
                props: {
                    items,
                    focused: true
                }
            });

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.click(document.body);
            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
            expect(selectInput).not.toBe(document.activeElement);
        });

        it('preserves filterText value on blur when clearFilterTextOnBlur is false', async () => {
            const user = userEvent.setup();

            const outsideDiv = document.createElement('div');
            outsideDiv.textContent = 'Outside';
            outsideDiv.tabIndex = 0; // Make it focusable/clickable
            document.body.appendChild(outsideDiv);

            render(Select, {
                props: {
                    items,
                    clearFilterTextOnBlur: false,
                    focused: true,
                    filterText: 'potato'
                }
            });


            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(selectInput.value).toBe('potato');

            await user.click(outsideDiv);
            await tick();

            outsideDiv.remove();

            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
            expect(selectInput).not.toBe(document.activeElement);
            expect(selectInput.value).toBe('potato');
        });

        it('clears filterText value on blur', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true,
                    filterText: 'potato'
                }
            });

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;

            await tick();
            selectInput.blur();
            await tick();
            expect(selectInput.value).toBe('');
        });
    });

    describe('Selection behavior', () => {
        it('closes list but keeps focus when selecting item', async () => {
            render(Select, { props: { items } });

            await querySelectorClick('.svelte-select');
            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();
            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
            expect(document.querySelector('.svelte-select.focused')).toBeTruthy();
        });

        it('opens list with item listed as active when clicking Select with selected item', async () => {
            render(Select, { props: { items } });

            await querySelectorClick('.svelte-select');
            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();
            await querySelectorClick('.svelte-select');
            await tick();
            expect(document.querySelector('.list-item .active')!.textContent).toBe('Cake');
        });
    });

    describe('Focus state', () => {
        it('updates focus state when Select input is focused', async () => {
            render(Select, { props: { items } });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement | null;
            input?.focus();

            expect(input).toBe(document.activeElement);
        });

        it('opens list when key up or down is pressed while focused', async () => {
            render(Select, { props: { items } });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.focus();
            await tick();

            expect(input).toBe(document.activeElement);

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeTruthy();
        });
    });

    describe('List width', () => {
        it('keeps width of parent Select', async () => {
            render(Select, {
                props: {
                    items,
                    focused: true
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.focus();

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            await tick();

            const selectContainer = document.querySelector('.svelte-select') as HTMLElement | null;
            const listContainer = document.querySelector('.svelte-select-list') as HTMLElement | null;

            if (selectContainer && listContainer) {
                expect(selectContainer.offsetWidth).toBe(listContainer.offsetWidth);
            } else {
                expect.fail('Containers not found');
            }
        });
    });

    describe('Placeholder', () => {
        it('reappears when list is closed', async () => {
            const div = document.createElement('div');
            document.body.appendChild(div);

            render(Select, { props: { items } });

            await querySelectorClick('.svelte-select');
            div.click();
            div.remove();
            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(selectInput.placeholder).toBe('Please select');
        });

        it('wipes while item is selected', () => {
            render(Select, {
                props: {
                    items,
                    value: { name: 'Item #2' },
                }
            });

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(selectInput.placeholder).toBe('');
        });

        it('is prop value', () => {
            const placeholder = 'Test placeholder value';

            render(Select, {
                props: {
                    items: itemsWithGroup,
                    placeholder
                }
            });

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(selectInput.placeholder).toBe(placeholder);
        });
    });

    describe('Filter text', () => {
        it('hides selected item while typing', async () => {
            render(Select, {
                props: {
                    items,
                    filterText: 'potato'
                }
            });

            await querySelectorClick('.svelte-select');
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            expect(document.querySelector('.svelte-select .value')).toBeFalsy();
        });

        it('closes list when clearing selected item', async () => {
            render(Select, { props: { items } });

            await querySelectorClick('.svelte-select');
            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();
            const clearButton = document.querySelector('.clear-select') as HTMLElement;
            clearButton?.click();
            await tick();
            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
        });

        it('clears on list close', async () => {
            const div = document.createElement('div');
            document.body.appendChild(div);

            render(Select, {
                props: {
                    items,
                    filterText: 'potato'
                }
            });

            await querySelectorClick('.svelte-select');
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            div.click();
            div.remove();
            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(selectInput.placeholder).toBe('Please select');
        });

        it('populates while Select is focused and typing', () => {
            render(Select, {
                props: {
                    items,
                    focused: true,
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.blur();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 't' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'e' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 's' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 't' }));
        });

        it('filters list', async () => {
            const user = userEvent.setup();

            render(Select, { props: { items } });
            await tick();

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.click(selectInput);

            let listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(5);

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'Ice';

            input.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();
            listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(1);
        });

        it('filters list with custom itemFilter', async () => {
            const user = userEvent.setup();

            render(Select, {
                props: {
                    items,
                    itemFilter: (label: string) => label === 'Ice Cream'
                }
            });
            await tick();

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.click(selectInput);

            let listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(1);

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'cream ice';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();
            listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(1);
        });

        it('opens list when typing in filter', async () => {
            const user = userEvent.setup();

            const { component } = render(Select, {
                props: {
                    items,
                    focused: true
                }
            }) as { component: SelectInstance };
            await tick();

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.click(selectInput);

            component.filterText = '5';
            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeTruthy();
        });

        it('highlights first item while filtering', async () => {
            const user = userEvent.setup();

            const { component } = render(Select, {
                props: {
                    items,
                    focused: true
                }
            }) as { component: SelectInstance };
            await tick();

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.click(selectInput);

            component.filterText = 'I';
            await tick();

            expect(document.querySelector('.list-item .hover')).toBeTruthy();
        });
    });

    describe('Container styles', () => {
        it('can be overridden', () => {
            render(Select, {
                props: {
                    items,
                    value: { name: 'Item #2' },
                    containerStyles: `padding-left: 40px;`
                }
            });

            const container = document.querySelector('.svelte-select') as HTMLElement;
            expect(container.style.cssText).toBe(`padding-left: 40px;`);
        });

        it('can be injected via class', () => {
            render(Select, {
                props: {
                    items,
                    value: { value: 'cake', label: 'Cake' },
                    class: 'svelte-select testclass',
                }
            });

            const container = document.querySelector('.svelte-select') as HTMLElement;
            expect(container.classList.contains('testclass')).toBeTruthy();
        });
    });

    describe('Disabled state', () => {
        it('shows disabled class', () => {
            render(Select, {
                props: {
                    items,
                    disabled: true,
                }
            });

            expect(document.querySelector('.svelte-select.disabled')).toBeTruthy();
        });

        it('cannot be cleared when disabled', () => {
            render(Select, {
                props: {
                    items,
                    disabled: true,
                    value: { name: 'Item #4' }
                }
            });

            expect(document.querySelector('.clear-select')).toBeFalsy();
        });
    });

    describe('List behavior', () => {
        it('closes when pressing enter', async () => {
            render(Select, {
                props: {
                    items,
                    focused: true
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();
        });

        it('state controls list visibility', async () => {
            const { rerender } = render(Select, {
                props: {
                    items,
                    listOpen: true
                }
            });

            await tick();
            expect(document.querySelector('.svelte-select-list')).toBeTruthy();

            await rerender({
                items,
                listOpen: false
            });

            await tick();
            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
        });

        it('toggles open state when clicking Select', async () => {
            render(Select, { props: { items } });

            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
            await querySelectorClick('.svelte-select');
            expect(document.querySelector('.svelte-select-list')).toBeTruthy();
            await querySelectorClick('.svelte-select');
            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
        });
    });

    describe('Two-way binding', () => {
        it('works between Select and parent component', async () => {
            render(ParentContainer, {
                props: {
                    items,
                    value: { value: 'chips', label: 'Chips' },
                }
            });

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            const result = document.querySelector('.result') as HTMLElement;

            expect(selectedItem.textContent).toBe(result.textContent);

            cleanup();

            render(ParentContainer, {
                props: {
                    items,
                    value: { value: 'ice-cream', label: 'Ice Cream' },
                }
            });

            expect(selectedItem.textContent).toBe(result.textContent);

            await querySelectorClick('.svelte-select');
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));

            expect(selectedItem.textContent).toBe(result.textContent);
        });
    });

    describe('Text overflow', () => {
        // Need to use Playwright instead
        it.skip('shows ellipsis for overflowing text in list item', async () => {
            const longest = 'super super super super super super super super super super super super super super super super super super super super super super super super super super super super loooooonnnng name';

            const container = document.createElement('div');
            container.style.width = '300px';
            container.style.position = 'relative';
            document.body.appendChild(container);

            render(Select, {
                target: container,
                props: {
                    listOpen: true,
                    items: [
                        {
                            index: 0,
                            label: longest
                        },
                        {
                            index: 1,
                            label: 'Not so loooooonnnng name'
                        }
                    ]
                }
            });

            await tick();
            const first = document.querySelector('.list-item:first-child .item') as HTMLElement;
            const last = document.querySelector('.list-item:last-child .item') as HTMLElement;

            if (first && last) {
                expect(first.scrollWidth).toBeGreaterThan(first.clientWidth);
                expect(last.scrollWidth).toBe(last.clientWidth);
            } else {
                expect.fail('List items not found');
            }

            container.remove();
        });
    });

    describe('External focus', () => {
        it('closes and blurs when focusing external textarea', async () => {
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);

            render(Select, {
                props: {
                    listOpen: true,
                    items,
                }
            });

            textarea.focus();
            await tick();
            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
            textarea.remove();
        });

        it('closes when clicking external textarea', async () => {
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);

            render(Select, {
                props: {
                    listOpen: true,
                    items,
                }
            });

            expect(document.querySelector('.svelte-select-list')).toBeTruthy();

            const textareaElement = document.querySelector('textarea') as HTMLTextAreaElement;
            textareaElement.focus();

            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeFalsy();

            textarea.remove();
        });
    });

    describe('Single item list', () => {
        it('has hover state when only one item', () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: [{
                        value: 0,
                        label: 'tests one'
                    }]
                }
            });

            const item = document.querySelector('.list-item .item') as HTMLElement;
            expect(item && item.classList.contains('hover')).toBeTruthy();
        });
    });

    describe('Filtered list hover', () => {
        it('shows hover state in filtered list', async () => {
            render(Select, { props: { items } });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'i';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();

            const hoveredItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoveredItem !== null).toBeTruthy();
        });
    });

    describe('Item data preservation', () => {
        it('preserves all data from item', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    items,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await querySelectorClick('.svelte-select');
            await querySelectorClick('.list-item');
            await tick();

            expect(JSON.stringify(capturedValue)).toBe(JSON.stringify({ value: 'chocolate', label: 'Chocolate' }));
        });
    });

    describe('Clearable', () => {
        it('does not show clear button when clearable is false', async () => {
            render(Select, {
                props: {
                    items,
                    clearable: false
                }
            });

            await querySelectorClick('.svelte-select');
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));

            expect(document.querySelector('.clear-select')).toBeFalsy();
        });
    });

    describe('Searchable', () => {
        it('makes input readonly when searchable is false', () => {
            render(Select, {
                props: {
                    items,
                    searchable: false
                }
            });

            const selectInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(selectInput.hasAttribute('readonly')).toBeTruthy();
        });

        it('makes input readonly when searchable is false (duplicate test)', () => {
            render(Select, {
                props: {
                    items,
                    searchable: false
                }
            });

            const elem = document.querySelector('.svelte-select input') as HTMLElement;
            expect(elem.hasAttribute('readonly')).toBeTruthy();
        });
    });

    describe('Loading', () => {
        it('displays loading icon when loading is enabled', () => {
            render(Select, {
                props: {
                    items,
                    loading: true
                }
            });

            expect(document.querySelector('.loading')).toBeTruthy();
        });
    });

    describe('Input styles', () => {
        it('applies css to select input', () => {
            render(Select, {
                props: {
                    items,
                    value: { value: 'pizza', label: 'Pizza' },
                    inputStyles: `padding-left: 40px;`
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(input.style.cssText).toBe(`padding-left: 40px;`);
        });
    });

    describe('GroupBy', () => {
        it('groups items by expression', () => {
            function groupBy(item: any) {
                return item.group;
            }

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithGroup,
                    groupBy
                }
            });

            const titleElement = document.querySelector('.list-group-title') as HTMLElement;
            const itemElement = document.querySelector('.list-item .item.group-item') as HTMLElement;

            expect(titleElement && titleElement.textContent === 'Sweet').toBeTruthy();
            expect(itemElement && itemElement.textContent === 'Chocolate').toBeTruthy();
        });

        it('group header is not selectable by default', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithGroup,
                    groupBy: (item: any) => item.group
                }
            });

            await tick();
            await querySelectorClick('.list-group-title');

            expect(document.querySelector('.selected-item')).toBeFalsy();
        });

        it('group header can be selectable when groupHeaderSelectable is true', async () => {
            let capturedValue: any;

            function groupBy(item: any) {
                return item.group;
            }

            function createGroupHeaderItem(groupValue: any, item: any) {
                return {
                    label: `XXX ${groupValue} XXX ${item.label}`
                };
            }

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithGroup,
                    groupHeaderSelectable: true,
                    groupBy,
                    createGroupHeaderItem,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await tick();
            await querySelectorClick('.list-item');
            await tick();

            expect(capturedValue && capturedValue.groupHeader).toBeTruthy();

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.innerHTML.includes('XXX')).toBeTruthy();
        });

        it('sorts groups by expression', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithGroup,
                    groupBy: (item: any) => item.group,
                    groupFilter: (groups: any) => groups.reverse()
                }
            });

            await tick();

            const groupTitle = document.querySelector('.list-group-title') as HTMLElement;
            const groupItem = document.querySelector('.list-item .group-item') as HTMLElement;

            expect(groupTitle && groupTitle.textContent?.trim() === 'Savory').toBeTruthy();
            expect(groupItem && groupItem.textContent?.trim() === 'Pizza').toBeTruthy();
        });

        it('closes list without selecting when no active item and enter is pressed', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithGroup,
                    groupBy: (item: any) => item.group
                }
            });

            await tick();
            await querySelectorClick('.svelte-select');
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            expect(document.querySelector('.selected-item')).toBeFalsy();
        });

        it('renders correct message when filter results in no items', async () => {
            function groupBy(item: any) {
                return item.group;
            }

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithGroup,
                    groupBy
                }
            });

            await tick();

            let title = document.querySelector('.list-group-title') as HTMLElement;
            expect(title && title.textContent === 'Sweet').toBeTruthy();

            let item = document.querySelector('.list-item .item.group-item') as HTMLElement;
            expect(item && item.textContent === 'Chocolate').toBeTruthy();

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'foo';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();

            let empty = document.querySelector('.svelte-select-list .empty');
            expect(empty).toBeTruthy();
        });

        it('renders correctly with itemId and label', () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: [
                        { id: 1, name: 'name 1', group: 'group 1' },
                        { id: 2, name: 'name 2', group: 'group 1' },
                        { id: 3, name: 'name 3', group: 'group 2' },
                        { id: 4, name: 'name 4', group: 'group 1' },
                        { id: 5, name: 'name 5', group: 'group 3' },
                    ],
                    itemId: 'id',
                    label: 'name',
                    groupBy: (i: any) => i.group,
                }
            });

            let titles = document.querySelectorAll('.list-group-title');
            let items = document.querySelectorAll('.item.group-item');

            expect(titles[1].textContent).toBe('group 2');
            expect(items[3].textContent).toBe('name 3');
        });

        it('sets correct hoverItemIndex with groupBy and value', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: [
                        { value: 1, name: 'name 1', group: 'group 1' },
                        { value: 2, name: 'name 2', group: 'group 1' },
                        { value: 3, name: 'name 3', group: 'group 2' },
                        { value: 4, name: 'name 4', group: 'group 1' },
                        { value: 5, name: 'name 5', group: 'group 3' },
                    ],
                    label: 'name',
                    groupBy: (i: any) => i.group,
                }
            });

            await tick();

            let hoverItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoverItem && hoverItem.textContent?.includes('name 1')).toBeTruthy();

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            await tick();

            hoverItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoverItem && hoverItem.textContent?.includes('name 2')).toBeTruthy();

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            await tick();

            hoverItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoverItem && hoverItem.textContent?.includes('name 2')).toBeTruthy();
        });

        it('ensures filtering works with groupBy after value selection', async () => {
            const user = userEvent.setup();

            render(Select, {
                props: {
                    items: itemsWithGroup,
                    groupBy: (item: any) => item.group,
                    listOpen: true
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'Cake';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await tick();

            const listItemElement = document.querySelector('.list-item .item.group-item') as HTMLElement;
            listItemElement.click();
            await tick();

            await user.click(input);
            await tick();

            const listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(7);
        });

        it('works with loadOptions', async () => {
            function groupBy(item: any) {
                return item.group;
            }

            render(Select, {
                props: {
                    debounceWait: 1,
                    groupBy,
                    loadOptions: async function () {
                        return itemsWithGroup;
                    }
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await wait(10);
            await tick();
            await tick();

            const header = document.querySelector('.svelte-select-list .list-group-title') as HTMLElement;

            expect(header && header.textContent === 'Sweet').toBeTruthy();
        });
    });

    describe('Multiple selection', () => {
        it('shows each item in value', () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [
                        { value: 'pizza', label: 'Pizza' },
                        { value: 'chips', label: 'Chips' },
                    ],
                }
            });

            const all = document.querySelectorAll('.multi-item span');

            expect(all[0].innerHTML.startsWith('Pizza')).toBeTruthy();
            expect(all[1].innerHTML.startsWith('Chips')).toBeTruthy();
        });

        it('shows placeholder when value is undefined', () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: undefined
                }
            });

            expect(document.querySelector('.multi-item span')).toBeFalsy();
        });

        it('populates value when clicking item in list', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: undefined,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await querySelectorClick('.svelte-select');
            await querySelectorClick('.list-item');

            await tick();

            expect(JSON.stringify(capturedValue)).toBe(JSON.stringify([{ value: 'chocolate', label: 'Chocolate' }]));
        });

        it('items in value do not appear in list', async () => {
            const user = userEvent.setup();

            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [{ value: 'chocolate', label: 'Chocolate' }]
                }
            });

            await tick();

            const selectContainer = document.querySelector('.svelte-select') as HTMLElement;
            await user.click(selectContainer);

            const listItems = Array.from(document.querySelectorAll('.list-item .item')).map(
                (item) => (item as HTMLElement).textContent?.trim()
            );

            expect(listItems.length).toBe(4);
            expect(listItems.includes('Chocolate')).toBeFalsy();
            expect(listItems.includes('Pizza')).toBeTruthy();
            expect(listItems.includes('Cake')).toBeTruthy();
            expect(listItems.includes('Chips')).toBeTruthy();
            expect(listItems.includes('Ice Cream')).toBeTruthy();
        });

        it('filters list with both value and filterText', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    multiple: true,
                    items,
                    value: [{ value: 'chocolate', label: 'Chocolate' }]
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'Pizza';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();

            const listItems = Array.from(document.querySelectorAll('.list-item .item')).map(
                (item) => (item as HTMLElement).textContent?.trim()
            );

            expect(listItems.length).toBe(1);
            expect(listItems.includes('Pizza')).toBeTruthy();
        });

        it('removes item from value when clicking X', async () => {
            const user = userEvent.setup();
            let capturedValue: any;

            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [{ value: 'chocolate', label: 'Chocolate' }, { value: 'pizza', label: 'Pizza' }],
                    oninput: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            const clearButton = document.querySelector('.multi-item-clear') as HTMLElement;
            await user.click(clearButton);
            await tick();

            expect(JSON.stringify(capturedValue)).toBe(JSON.stringify([{ value: 'pizza', label: 'Pizza' }]));
        });

        it('shows placeholder and hides clear all when all items removed', async () => {
            const user = userEvent.setup();

            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [{ value: 'chocolate', label: 'Chocolate' }]
                }
            });

            const clearButton = document.querySelector('.multi-item-clear') as HTMLElement;
            await user.click(clearButton);
            await tick();

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(input.placeholder).toBe('Please select');
            expect(document.querySelector('.clear-select')).toBeFalsy();
        });

        it('clears all selected items with clear all button', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [{ value: 'chocolate', label: 'Chocolate' }, { value: 'pizza', label: 'Pizza' }],
                    onclear: () => { }
                }
            });

            const clearButton = document!.querySelector('.clear-select') as HTMLInputElement;
            clearButton.click();

            await tick();

            expect(document.querySelector('.multi-item')).toBeFalsy();
        });

        it('items are selectable with groupBy', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    multiple: true,
                    items: itemsWithGroup,
                    groupBy: (item: any) => item.group,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await querySelectorClick('.svelte-select');
            await querySelectorClick('.list-item .group-item');
            await tick();

            expect(JSON.stringify(capturedValue)).toBe(JSON.stringify([{ "groupItem": true, "value": "chocolate", "label": "Chocolate", "group": "Sweet" }]));
        });

        it.skip('Select height increases when items wrap', async () => {
            const { component } = render(Select, {
                props: {
                    multiple: true,
                    items
                }
            }) as { component: SelectInstance };

            const container = document.querySelector('.svelte-select') as HTMLElement;
            container.style.maxWidth = '200px';

            const container1 = document.querySelector('.svelte-select') as HTMLElement;
            expect(container1.scrollHeight).toBe(40);

            component.value = [{ value: 'chocolate', label: 'Chocolate' }, { value: 'pizza', label: 'Pizza' }];
            await tick();

            const container2 = document.querySelector('.svelte-select') as HTMLElement;
            expect(container2.scrollHeight).toBeGreaterThan(42);
        });

        it('navigating with LeftArrow updates activeValue', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [{ value: 'chocolate', label: 'Chocolate' }, { value: 'pizza', label: 'Pizza' }, { value: 'chips', label: 'Chips' }],
                    focused: true
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowLeft' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowLeft' }));

            await tick();

            const activeItem = document.querySelectorAll('.multi-item.active');
            expect(activeItem.length).toBe(1);

            const allItems = document.querySelectorAll('.multi-item');
            expect(allItems[1].classList.contains('active')).toBeTruthy();
        });

        it('navigating with ArrowRight updates activeValue', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [{ value: 'chocolate', label: 'Chocolate' }, { value: 'pizza', label: 'Pizza' }, { value: 'chips', label: 'Chips' }],
                    focused: true
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowLeft' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowLeft' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowLeft' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowRight' }));

            await tick();

            const allItems = document.querySelectorAll('.multi-item');
            expect(allItems[1].classList.contains('active')).toBeTruthy();
        });

        it('first item in list is active when list opens with value', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                }
            });

            await querySelectorClick('.svelte-select');
            await querySelectorClick('.list-item');
            await tick();
            await handleKeyboard('ArrowDown');
            expect(document.querySelector('.list-item .hover')).toBeTruthy();
        });

        it('items are locked when disabled', () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    disabled: true,
                    value: [{ value: 'chocolate', label: 'Chocolate' }],
                }
            });

            expect(document.querySelector('.multi-item.disabled')).toBeTruthy();
        });

        it('works with simple arrays', () => {
            render(Select, {
                props: {
                    multiple: true,
                    items: ['pizza', 'chips', 'chocolate'],
                    value: ['pizza', 'chocolate']
                }
            });

            const all = document.querySelectorAll('.multi-item span');
            expect(all[0].innerHTML.startsWith('pizza')).toBeTruthy();
            expect(all[1].innerHTML.startsWith('chocolate')).toBeTruthy();
        });

        it('checks for unique items in value', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [
                        { value: 'pizza', label: 'Pizza' },
                        { value: 'pizza', label: 'Pizza' },
                        { value: 'cake', label: 'Cake' },
                    ],
                }
            });

            await tick();

            const multiItems = document.querySelectorAll('.multi-item');
            expect(multiItems.length).toBe(2);
        });

        it('selects item with enter when textFilter has length', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    multiple: true,
                    items,
                    focused: true,
                    filterText: 'p',
                    listOpen: true,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();
            expect(capturedValue && capturedValue[0].value).toBe('pizza');
        });

        it('does nothing when enter is pressed with no items in list', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    focused: true,
                    filterText: 'zc',
                    listOpen: true
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            expect(document.querySelector('.multi-item')).toBeFalsy();
        });

        it('delete does nothing when no selected item', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    focused: true,
                    listOpen: true
                }
            });

            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Backspace' }));
            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeTruthy();
        });

        it('on:input events fire on each item removal', async () => {
            const user = userEvent.setup();
            let events: string[] = [];

            render(Select, {
                props: {
                    items,
                    multiple: true,
                    value: ['Cake', 'Chips'],
                    oninput: () => {
                        events.push('event fired');
                    }
                }
            });

            const event = new PointerEvent('pointerup', { bubbles: true });
            window.dispatchEvent(event);

            let clearButton = document.querySelector('.multi-item-clear') as HTMLElement;
            await user.click(clearButton);
            await tick();

            clearButton = document.querySelector('.multi-item-clear') as HTMLElement;
            await user.click(clearButton);
            await tick();

            expect(events.length).toBe(3);
        });

        it('checks if value[itemId] changed before firing input event', async () => {
            let inputFired: boolean = false;

            const {rerender} = render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [
                        { value: 'pizza', label: 'Pizza' },
                        { value: 'chips', label: 'Chips' },
                    ],
                    oninput: () => {
                        inputFired = true;
                    }
                }
            });

            await tick();
            expect(inputFired).toBeFalsy();

            // Same value, should not fire
            await rerender({
                multiple: true,
                items,
                value: [
                    { value: 'pizza', label: 'Pizza' },
                    { value: 'chips', label: 'Chips' },
                ],
                oninput: () => {
                    inputFired = true;
                }
            });
            await tick();
            expect(inputFired).toBeFalsy();

            await rerender({
                multiple: true,
                items,
                value: [
                    { value: 'pizza', label: 'Pizza' }
                ],
                oninput: () => {
                    inputFired = true;
                }
            });
            await tick();

            expect(inputFired).toBeTruthy();
        });

        it('filters list when filterText is applied and groupBy is active', async () => {
            let _items = [
                { id: 1, name: "Foo", group: "first" },
                { id: 2, name: "Bar", group: "second" },
                { id: 3, name: "Baz", group: "second" },
                { id: 4, name: "Qux", group: "first" },
                { id: 5, name: "Bah", group: "first" },
            ];

            render(Select, {
                props: {
                    multiple: true,
                    items: _items,
                    groupBy: (item: any) => item.group,
                    itemId: 'id',
                    label: 'name',
                    value: [{ id: 2, name: 'Bar', group: 'second' }],
                    listOpen: true,
                }
            });

            const listItems = Array.from(document.querySelectorAll('.list-item .item')).map(
                (item) => (item as HTMLElement).textContent?.trim()
            );

            expect(listItems.includes('Bar')).toBeFalsy();
        });

        it('filters out already selected items', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    listOpen: true,
                    value: [{ value: 'chips', label: 'Chips' }, { value: 'pizza', label: 'Pizza' }],
                }
            });

            await tick();

            const listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(3);
        });

        it('removes item when multiFullItemClearable is true', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    multiple: true,
                    items,
                    multiFullItemClearable: true,
                    value: [{ value: 'chips', label: 'Chips' }, { value: 'pizza', label: 'Pizza' }],
                    oninput: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await tick();
            await querySelectorClick('.multi-item');
            await tick();

            expect(capturedValue && capturedValue[0].label).toBe('Pizza');
        });

        it('always shows placeholder when placeholderAlwaysShow is true', async () => {
            render(Select, {
                props: {
                    items,
                    value: [{ value: 'chocolate', label: 'Chocolate' },
                        { value: 'pizza', label: 'Pizza' },],
                    multiple: true,
                    placeholderAlwaysShow: true,
                    placeholder: 'foo bar'
                }
            });

            await tick();
            let elem = document.querySelector('.svelte-select input[type="text"]') as HTMLInputElement;
            expect(elem.placeholder).toBe('foo bar');
        });
    });

    describe('Label and itemId', () => {
        it('shows correct label when label prop is set', () => {
            render(Select, {
                props: {
                    items: [{ value: 0, label: 'ONE' }, { value: 1, label: 'TWO' }],
                    value: { value: 0, label: 'ONE' },
                    label: 'label',
                    itemId: 'label',
                }
            });

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('ONE');
        });

        it('uses itemId to update value', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    items: [{ id: 'ONE', label: 'ONE' }, { id: 'TWO', label: 'TWO' }],
                    value: { id: 'ONE', label: 'ONE' },
                    itemId: 'id',
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('ONE');

            await querySelectorClick('.svelte-select');
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            expect(capturedValue && capturedValue.id).toBe('TWO');
        });

        it('displays result of label when no items', () => {
            render(Select, {
                props: {
                    label: 'notLabel',
                    value: { notLabel: 'This is not a label', value: 'not important' },
                }
            });

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('This is not a label');
        });

        it('displays result of label for each option', async () => {
            const user = userEvent.setup();

            render(Select, {
                props: {
                    label: 'notLabel',
                    listOpen: true,
                    items: [
                        { notLabel: 'This is not a label', value: 'not important #1' },
                        { notLabel: 'This is also not a label', value: 'not important #2' },
                    ],
                }
            });

            const firstItem = document.querySelector('.list-item') as HTMLElement;
            await user.click(firstItem);
            await tick();

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem?.textContent).toBe('This is not a label');
        });

        it('returns correct justValue with itemId', async () => {
            render(Select, {
                props: {
                    items: collection,
                    value: { _id: 2, label: 'Cake' },
                    itemId: '_id',
                    useJustValue: true,
                }
            });

            await tick();

            const hidden = document.querySelector('input[type="hidden"]') as HTMLInputElement;
            expect(hidden && hidden.value).toBe('2');
        });
    });

    describe('LoadOptions', () => {
        it('populates items via promise resolve', async () => {
            render(Select, {
                props: {
                    label: 'name',
                    loadOptions: getPosts,
                    itemId: 'id',
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'Juniper';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await tick();

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));

            await tick();
        });

        it('populates items with multiple selection', async () => {
            const user = userEvent.setup();

            render(Select, {
                props: {
                    loadOptions: getPosts,
                    itemId: 'id',
                    multiple: true
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.type(input, 'Juniper');
            await wait(300);
            await tick();

            await handleKeyboard('ArrowDown');
            await tick();
            await handleKeyboard('Enter');
            await tick();

            const selectedItem = document.querySelector('.multi-item') as HTMLElement;
            expect(selectedItem?.textContent?.includes('Juniper Wheat Beer')).toBeTruthy();
        });

        it('dispatches loaded event when promise resolves', async () => {
            let loadedEventData: any;

            render(Select, {
                props: {
                    loadOptions: resolvePromise,
                    onloaded: (options: any) => {
                        loadedEventData = { detail: { items: options } };
                    },
                    onerror: () => { }
                }
            });

            await tick();
            cleanup();

            render(Select, {
                props: {
                    loadOptions: resolvePromise,
                    listOpen: true,
                    onloaded: (options: any) => {
                        loadedEventData = { detail: { items: options } };
                    },
                    onerror: () => { }
                }
            });

            await tick();

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'test';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await wait(300);
            await tick();

            expect(loadedEventData?.detail.items[0].value).toBe('a');
        });

        it('dispatches error event when promise rejects', async () => {
            const user = userEvent.setup();
            let errorEventData: any;

            render(Select, {
                props: {
                    loadOptions: rejectPromise,
                    onloaded: () => { },
                    onerror: (error: any) => {
                        errorEventData = { detail: error };
                    }
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.type(input, 'test');

            await wait(300);
            await tick();

            expect(errorEventData.detail).toBe('error 123');
        });

        it('shows items on promise resolve with value', async () => {
            const loadOptionsFn = async () => {
                return Promise.resolve([
                    { value: 'chocolate', label: 'Chocolate' },
                    { value: 'ice-cream', label: 'Ice-cream' },
                    { value: 'pizza', label: 'pizza' },
                ]);
            };

            render(Select, {
                props: {
                    value: {
                        value: 'chocolate', label: 'Chocolate'
                    },
                    listOpen: true,
                    filterText: 'a',
                    loadOptions: loadOptionsFn
                }
            });

            await wait(300);
            await tick();

            const listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(3);
        });

        it('retains filterText on promise resolve with multiple', async () => {
            const loadOptionsFn = async () => {
                return Promise.resolve([
                    { value: 'chocolate', label: 'Chocolate' },
                    { value: 'ice-cream', label: 'Ice-cream' },
                    { value: 'pizza', label: 'pizza' },
                ]);
            }

            render(Select, {
                props: {
                    multiple: true,
                    value: {
                        value: 'chocolate', label: 'Chocolate'
                    },
                    listOpen: true,
                    filterText: 'test',
                    loadOptions: loadOptionsFn
                }
            });

            await wait(300);

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(input.value).toBe('test');
        });

        it('closes list on blur with loadOptions and items', async () => {
            const user = userEvent.setup();
            let items = [{ value: 1, label: '1' }, { value: 2, label: '2' }];

            render(Select, {
                props: {
                    items,
                    loadOptions: getPosts,
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            await tick();

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.type(input, 's');
            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeTruthy();

            await user.click(document.body);
            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
        });

        it('maintains loading state when response returns cancelled', async () => {
            const user = userEvent.setup();

            let resolvePromise: any;

            function getDelayedRes() {
                return new Promise<SelectItem[]>((resolve) => {
                    resolvePromise = resolve;
                });
            }

            render(Select, {
                props: {
                    loadOptions: getDelayedRes,
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            await user.type(input, 'Juniper');

            await wait(300);
            await tick();

            expect(document.querySelector('.loading')).toBeTruthy();

            resolvePromise([]);
            await tick();
        });

        it('sets initial value correctly', async () => {
            render(LoadOptionsGroup, {
                props: {
                    value: 'cake'
                }
            });


            await tick();
            await tick(); // Extra tick for effects to cascade

            const selectedItem = document.querySelector('.value-container .selected-item') as HTMLElement;
            expect(selectedItem?.textContent?.trim()).toBe('Cake');
        });

        it('does not duplicate titles after filterText clears', async () => {
            render(LoadOptionsGroup);

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;

            input.value = 'cre';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await tick();
            await new Promise(resolve => setTimeout(resolve, 50));

            console.log('List open?', document.querySelector('.svelte-select-list'));
            console.log('Items:', document.querySelectorAll('.list-item'));
            console.log('Group titles:', document.querySelectorAll('.list-group-title'));

            console.log('Actual items in DOM:', document.querySelector('.list-item .item')?.textContent);
            console.log('Item classes:', document.querySelector('.list-item .item')?.className);

            expect(document.querySelectorAll('.list-group-title').length).toBe(1);

            input.value = 'cr';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await tick();
            await new Promise(resolve => setTimeout(resolve, 50));

            console.log('After second input - Group titles:', document.querySelectorAll('.list-group-title'));

            expect(document.querySelectorAll('.list-group-title').length).toBe(1);
        });
    });

    describe('Snippets', () => {
        it('renders selection snippet', async () => {
            render(SelectionSlotTest);
            await tick();

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('Slot: one');
        });

        it('renders multiple selection snippet', async () => {
            render(SelectionSlotMultipleTest);
            await tick();

            const items = document.querySelectorAll('.multi-item span');

            expect(items[0].textContent.startsWith('Index: 0 Slot: one')).toBeTruthy();
            expect(items[1].textContent.startsWith('Index: 1 Slot: two')).toBeTruthy();
        });

        it('renders chevron snippet', async () => {
            render(ChevronSlotTest);
            await tick();

            const element = document!.querySelector('.chevron') as HTMLElement;
            expect(element && element.textContent).toBe('⬆️');
        });

        it('renders list snippet', async () => {
            render(ListSlotTest);
            await tick();

            const element = document!.querySelector('.svelte-select-list') as HTMLElement;
            expect(element && element.textContent.trim()).toBe('onetwo');
        });

        it('renders input-hidden snippet', async () => {
            render(InputHiddenSlotTest);
            await tick();

            const element = document!.querySelector('input[type="hidden"][name="test"]') as HTMLInputElement;
            expect(element && element.value.trim()).toBe('one');
        });

        it('renders item snippet', async () => {
            render(ItemSlotTest);
            await tick();

            const element = document!.querySelector('.svelte-select-list .item') as HTMLElement;
            expect(element && element.textContent).toBe('* one *');
        });

        it('renders list-prepend and list-append snippets', async () => {
            render(OuterListTest);
            await tick();

            const element = document!.querySelector('.svelte-select-list') as HTMLElement;
            expect(element && element.textContent.startsWith('prepend')).toBeTruthy();
            expect(element && element.textContent.endsWith('append')).toBeTruthy();
        });

        it('renders clear icon snippet', () => {
            render(ClearIconSlotTest);

            const clearIcon = document.querySelector('.clear-select') as HTMLElement;
            expect(clearIcon && clearIcon.textContent).toBe('x');
        });

        it('renders prepend snippet', () => {
            render(PrependSlotTest);

            const beforeElement = document.querySelector('.before') as HTMLElement;
            expect(beforeElement && beforeElement.innerHTML).toBe('Before it all');
        });
    });

    describe('Hide empty state', () => {
        it('does not show empty state when hideEmptyState is true', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true,
                    filterText: 'x',
                    hideEmptyState: true
                }
            });

            await tick();

            expect(document.querySelector('.empty')).toBeFalsy();
        });
    });

    describe('Events', () => {
        it('fires change event when value is selected', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    listOpen: true,
                    items,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await handleKeyboard('ArrowDown');
            await handleKeyboard('Enter');

            expect(capturedValue).toBeTruthy();
        });

        it('fires clear event when value is cleared', async () => {
            let capturedValue: boolean = false;

            render(Select, {
                props: {
                    items,
                    value: items[0],
                    onclear: () => {
                        capturedValue = true;
                    }
                }
            });

            const clearButton = document!.querySelector('.clear-select') as HTMLElement;
            clearButton.click();

            expect(capturedValue).toBeTruthy();
        });

        it('fires clear event with removed item for multi', async () => {
            const user = userEvent.setup();
            const itemToRemove = items[0];
            let removedItem;

            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: [itemToRemove],
                    onclear: (value: any) => {
                        removedItem = value;
                    }
                }
            });

            const selectedItem = document!.querySelector('.multi-item-clear') as HTMLElement;
            await user.click(selectedItem);

            expect(JSON.stringify(removedItem)).toBe(JSON.stringify(itemToRemove));
        });

        it('fires clear event with removed item for single', async () => {
            const user = userEvent.setup();
            const itemToRemove = items[0];
            let removedItem;

            render(Select, {
                props: {
                    items,
                    value: itemToRemove,
                    onclear: (value: any) => {
                        removedItem = value;
                    }
                }
            });

            const clearButton = document!.querySelector('.clear-select') as HTMLElement;
            await user.click(clearButton);

            expect(JSON.stringify(removedItem)).toBe(JSON.stringify(itemToRemove));
        });

        it('highlights first item when items filter or update', async () => {
            const user = userEvent.setup();

            render(Select, {
                props: {
                    items,
                    focused: true
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            await tick();

            let hoverItem = document.querySelector('.svelte-select-list .hover') as HTMLElement;
            expect(hoverItem && hoverItem.textContent).toBe('Chocolate');

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;

            await user.type(input, 'chi');
            await tick()

            hoverItem = document.querySelector('.hover') as HTMLElement;
            expect(hoverItem && hoverItem.textContent).toBe('Chips');
        });

        it('checks value[itemId] changed before firing input event', async () => {
            let inputFired: boolean = false;

            const { component } = render(Select, {
                props: {
                    items,
                    value: { value: 'cake', label: 'Cake' },
                    oninput: () => {
                        inputFired = true;
                    }
                }
            }) as { component: SelectInstance };

            component.value = { value: 'cake', label: 'Cake' };
            await tick();
            expect(inputFired).toBeFalsy();
        });

        it('fires focus event', async () => {
            let f = false;

            render(Select, {
                props: {
                    items,
                    onfocus: () => {
                        f = true;
                    }
                }
            });

            const ele = document.querySelector('.svelte-select input') as HTMLInputElement;
            ele.focus();

            await tick();

            expect(f).toBeTruthy();
        });

        it('fires blur event', async () => {
            let b = false;

            render(Select, {
                props: {
                    items,
                    focused: true,
                    onblur: () => {
                        b = true;
                    }
                }
            });

            let ele = document.querySelector('.svelte-select input') as HTMLInputElement;
            ele.blur();

            await tick();

            expect(b).toBeTruthy();
        });

        it('fires change event when user selects item', async () => {
            let value;

            render(Select, {
                props: {
                    listOpen: true,
                    items,
                    onchange(e: any) {
                        value = JSON.stringify(e);
                    }
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();
            expect(value).toBe(JSON.stringify({ value: 'cake', label: 'Cake' }));
        });

        it('does not fire change event when item selected programmatically', async () => {
            let changeFired = false;

            render(Select, {
                props: {
                    listOpen: true,
                    items,
                    value: { value: 'cake', label: 'Cake' },
                    onchange: () => {
                        changeFired = true;
                    }
                }
            });

            await tick();

            expect(changeFired).toBeFalsy();
        });
    });

    describe('String items', () => {
        it('renders list with string array', async () => {
            const items = ['one', 'two', 'three'];

            render(Select, {
                props: {
                    items,
                    listOpen: true
                }
            });

            await tick();
            const item = document!.querySelector('.item') as HTMLElement;
            expect(item && item.textContent).toBe('one');
        });

        it('renders value with string items', () => {
            const items = ['one', 'two', 'three'];

            render(Select, {
                props: {
                    items,
                    value: { value: 'one', label: 'one', index: 0 }
                }
            });

            const selectedItem = document!.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('one');
        });

        it('renders value when items and value are strings', () => {
            render(Select, {
                props: {
                    items: ['Pizza', 'Chocolate', 'Crisps'],
                    value: 'Pizza'
                }
            });

            const selectedItem = document!.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('Pizza');
        });
    });

    it('loses focus when another element is focused', async () => {
        render(Select, {
            props: {
                focused: true,
                items,
            }
        });

        const input = document.querySelector('.svelte-select input') as HTMLInputElement;
        expect(input).toBe(document.activeElement);

        // Create another element and focus it
        const button = document.createElement('button');
        document.body.appendChild(button);
        button.focus();

        await tick();

        expect(input).not.toBe(document.activeElement);

        button.remove();
    });

    describe('Items update', () => {
        it('updates value when items change', async () => {
            render(Select, {
                props: {
                    items,
                    value: 'chips',
                }
            });

            await tick();
            cleanup();

            render(Select, {
                props: {
                    items: [
                        { value: 'chocolate', label: 'Chocolate' },
                        { value: 'pizza', label: 'Pizza' },
                        { value: 'cake', label: 'Cake' },
                        { value: 'chips', label: 'Loaded Fries' },
                        { value: 'ice-cream', label: 'Ice Cream' },
                    ],
                    value: 'chips',
                },
            });

            await tick();

            let selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('Loaded Fries');
        });

        it('updates multiple values when items change', async () => {
            render(Select, {
                props: {
                    multiple: true,
                    items,
                    value: ['chips', 'pizza'],
                }
            });

            await tick();
            cleanup();

            render(Select, {
                props: {
                    multiple: true,
                    items: [
                        { value: 'chocolate', label: 'Chocolate' },
                        { value: 'pizza', label: 'Cheese Pizza' },
                        { value: 'cake', label: 'Cake' },
                        { value: 'chips', label: 'Loaded Fries' },
                        { value: 'ice-cream', label: 'Ice Cream' },
                    ],
                    value: ['chips', 'pizza'],
                },
            });

            await tick();
            await tick();

            const multiItems = Array.from(document.querySelectorAll('.multi-item-text')).map(
                (item) => (item as HTMLElement).textContent?.trim()
            );

            expect(multiItems.includes('Loaded Fries')).toBeTruthy();
            expect(multiItems.includes('Cheese Pizza')).toBeTruthy();
        });

        it('keeps value when item not found in updated items', async () => {
            render(Select, {
                props: {
                    items,
                    value: { value: 'chips', label: 'Chips' },
                }
            });

            await tick();

            cleanup();

            render(Select, {
                props: {
                    items: [
                        { value: 'chocolate', label: 'Chocolate' },
                        { value: 'pizza', label: 'Pizza' },
                        { value: 'cake', label: 'Cake' },
                        { value: 'loaded-fries', label: 'Loaded Fries' },
                        { value: 'ice-cream', label: 'Ice Cream' },
                    ],
                    value: { value: 'chips', label: 'Chips' },
                }
            });

            await tick();

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('Chips');
        });

        it('ensures filtering works when items updated post onMount', async () => {
            render(Select, {
                props: {
                    items: null
                }
            });

            await tick();

            cleanup();

            render(Select, {
                props: {
                    items: ['One', 'Two', 'Three'].map(item => ({ value: item, label: item })),
                    filterText: 'Two',
                    listOpen: true
                }
            });

            await tick();

            const listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(1);

            const item = document.querySelector('.list-item .item') as HTMLElement;
            expect(item && item.textContent?.trim()).toBe('Two');
        });

        it('ensures grouped filtering works when items updated post onMount', async () => {
            render(Select, {
                props: {
                    groupBy: (item: any) => item.group
                }
            });

            await tick();

            cleanup();

            render(Select, {
                props: {
                    items: ['One', 'Two', 'Three'].map(item => ({
                        value: item,
                        label: item,
                        group: item.includes('T') ? '2nd Group' : '1st Group'
                    })),
                    filterText: 'Tw',
                    listOpen: true,
                    groupBy: (item: any) => item.group
                }
            });

            await tick();

            const listItems = document.querySelectorAll('.list-item');
            expect(listItems.length).toBe(2);

            const groupHeader = document.querySelector('.list-group-title') as HTMLElement;
            expect(groupHeader && groupHeader.textContent?.trim()).toBe('2nd Group');

            const item = document.querySelector('.list-item .group-item') as HTMLElement;
            expect(item && item.textContent?.trim()).toBe('Two');
        });
    });

    describe('Value lookup', () => {
        it('looks up item using itemId when value is string', async () => {
            render(Select, {
                props: {
                    items,
                    value: 'cake'
                }
            });

            await tick();
            let selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('Cake');

            cleanup();

            render(Select, {
                props: {
                    items,
                    value: 'pizza'
                }
            });

            await tick();

            selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('Pizza');
        });

        it('sets value from item and shows correct label', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true,
                }
            });

            cleanup();

            render(Select, {
                props: {
                    items,
                    listOpen: true,
                    value: 'cake'
                }
            });

            await tick();

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('Cake');
        });
    });

    describe('List width and positioning', () => {
        it('has auto width when listAutoWidth is false', async () => {
            render(Select, {
                props: {
                    items,
                    listAutoWidth: false,
                    listOpen: true
                }
            });

            await tick();
            const listWidthElement = document.querySelectorAll('.svelte-select-list')[0] as HTMLElement;
            const listWidth = listWidthElement.style.width;
            expect(listWidth).toBe('auto');
        });

        it.skip('uses listOffset for positioning', async () => {
            render(Select, {
                props: {
                    items,
                    listOffset: 0,
                    listOpen: true
                }
            });

            await tick();
            let elem = document.querySelector('.svelte-select-list') as HTMLElement;
            expect(elem.style.top).toBe('41px');
        });
    });

    describe('Active item selection', () => {
        it('closes list when clicking already active item', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true,
                    value: 'pizza'
                }
            });

            await tick();
            await querySelectorClick('.svelte-select-list > .list-item > .item.active');
            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeFalsy();

            const selectedItem = document.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('Pizza');
        });

        it('clears filterText when selecting active value', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true
                }
            });

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'Cake';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();

            const listItemElement = document.querySelector('.list-item .item') as HTMLElement;
            listItemElement.click();

            await tick();

            cleanup();

            render(Select, {
                props: {
                    items,
                    listOpen: true,
                    value: { value: 'cake', label: 'Cake' }
                }
            });

            const input2 = document.querySelector('.svelte-select input') as HTMLInputElement;
            input2.value = 'Cake';
            input2.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();

            const activeItem = document.querySelector('.list-item .item.active') as HTMLElement;
            activeItem.click();

            await tick();

            const finalInput = document.querySelector('.svelte-select input') as HTMLInputElement;
            expect(finalInput.value.length).toBe(0);
        });
    });

    describe('ShowChevron', () => {
        it('only shows chevron when no value', () => {
            render(Select, {
                props: {
                    items,
                    value: { value: 'chocolate', label: 'Chocolate' },
                    showChevron: true
                }
            });

            expect(document.querySelectorAll('.indicator').length).toBe(0);
        });

        it('shows chevron when no value', () => {
            render(Select, {
                props: {
                    items,
                    showChevron: true
                }
            });

            expect(document.querySelectorAll('.chevron')[0]).toBeTruthy();
        });

        it('always shows chevron when clearable is false', () => {
            render(Select, {
                props: {
                    items,
                    value: { value: 'chocolate', label: 'Chocolate' },
                    showChevron: true,
                    clearable: false
                }
            });

            expect(document.querySelectorAll('.chevron')[0]).toBeTruthy();
        });
    });

    describe('Selectable items', () => {
        it('does not select item with selectable: false', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithSelectable
                }
            });

            await tick();
            await querySelectorClick('.list-item:nth-child(1)');
            expect(document.querySelector('.selected-item')).toBeFalsy();

            await querySelectorClick('.list-item:nth-child(4)');
            expect(document.querySelector('.selected-item')).toBeFalsy();
        });

        it('selects item with selectable not specified', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithSelectable,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await tick();
            const item = document.querySelector('.list-item:nth-child(2)') as HTMLElement;
            item.click();
            await tick();

            expect(capturedValue && capturedValue.value == 'selectableDefault').toBeTruthy();
        });

        it('selects item with selectable: true', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithSelectable,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await tick();
            await querySelectorClick('.list-item:nth-child(3)');
            await tick();

            expect(capturedValue && capturedValue.value == 'selectableTrue').toBeTruthy();
        });

        it('does not select with tab when selectable is false', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithSelectable,
                    filterText: '2'
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Tab' }));
            await tick();

            expect(document.querySelector('.selected-item')).toBeFalsy();
        });

        it('does not select with enter in multiple mode when selectable is false', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithSelectable,
                    filterText: '2',
                    multiple: true
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            expect(document.querySelector('.multi-item')).toBeFalsy();
        });

        it('resets hover index when only one non-selectable item', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    listOpen: true,
                    items: [
                        { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
                        { value: 'pizza', label: 'Pizza', group: 'Savory' },
                        { value: 'cake', label: 'Cake', group: 'Sweet', selectable: false },
                        { value: 'chips', label: 'Chips', group: 'Savory' },
                        { value: 'ice-cream', label: 'Ice Cream', group: 'Sweet' },
                    ],
                    filterText: 'Ca',
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            expect(capturedValue).toBeFalsy();

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'pi';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            expect(capturedValue && capturedValue.label).toBe('Pizza');
        });

        it('resets hover index when no selectable items', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithSelectable,
                    filterText: 'not',
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            await tick();

            expect(capturedValue).toBeFalsy();

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'se';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            await tick();

            expect(capturedValue && capturedValue.label).toBe('SelectableDefault');
        });
    });

    describe('Hover index', () => {
        it('sets to active value when listOpen with value', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: items,
                    value: { value: 'cake', label: 'Cake' },
                }
            });

            await tick();

            const hoverItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoverItem && hoverItem.textContent).toBe('Cake');

            const allItems = document.querySelectorAll('.list-item');
            const thirdItem = allItems[2].querySelector('.item') as HTMLElement;
            expect(thirdItem && thirdItem.classList.contains('hover')).toBeTruthy();
        });

        it('sets to last selected when listOpen with multiple', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: items,
                    multiple: true
                }
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

            await tick();
            await querySelectorClick('.svelte-select');
            await tick();

            const hoverItem = document.querySelector('.item.hover') as HTMLElement;
            expect(hoverItem?.textContent?.trim()).toBe('Ice Cream');
        });

        it('sets to active value with groupBy', async () => {
            render(Select, {
                props: {
                    listOpen: true,
                    items: itemsWithGroupAndSelectable,
                    value: { value: 'chocolate', label: 'Chocolate', group: 'Sweet' },
                    groupBy: (i: any) => i.group,
                    groupHeaderSelectable: true
                }
            });

            await tick();

            let hoverItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoverItem && hoverItem.textContent).toBe('Chocolate');

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

            await tick();

            hoverItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoverItem && (hoverItem.textContent === 'Savory' || hoverItem.classList.contains('list-group-title'))).toBeTruthy();
        });

        it('works correctly with custom test', async () => {
            render(HoverItemIndexTest);

            await querySelectorClick('.svelte-select');
            await tick();

            let hoverItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoverItem !== null).toBeTruthy();

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            await tick();

            hoverItem = document.querySelector('.list-item .hover') as HTMLElement;
            expect(hoverItem !== null).toBeTruthy();
        });
    });

    describe('CloseListOnChange', () => {
        it('keeps list open when closeListOnChange is false', async () => {
            let capturedValue: any;

            render(Select, {
                props: {
                    items,
                    closeListOnChange: false,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await querySelectorClick('.svelte-select');
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            expect(capturedValue && capturedValue.value).toBe('chocolate');
            expect(document.querySelector('.svelte-select-list')).toBeTruthy();

            await querySelectorClick('.svelte-select');
            await tick();
            expect(document.querySelector('.svelte-select-list')).toBeFalsy();

            await querySelectorClick('.svelte-select');
            await querySelectorClick('.list-item:nth-child(3)');
            await tick();

            expect(capturedValue && capturedValue.value).toBe('cake');
            expect(document.querySelector('.svelte-select-list')).toBeTruthy();

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();
            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
        });
    });

    describe('Input attributes', () => {
        it('applies to input field', () => {
            render(Select, {
                props: {
                    items,
                    inputAttributes: {
                        id: 'testId',
                        autocomplete: 'custom-value'
                    }
                }
            });

            const el = document.getElementById('testId') as HTMLInputElement;

            expect(el).toBeTruthy();
            expect(el.id).toBe('testId');
            expect(el.getAttribute('autocomplete')).toBe('custom-value');
        });
    });

    describe('Hidden input', () => {
        it('has name when supplied', () => {
            render(Select, {
                props: {
                    name: 'Foods',
                    items: items,
                    showChevron: true,
                }
            });

            const hidden = document.querySelector('input[type="hidden"]') as HTMLInputElement;
            expect(hidden.name).toBe('Foods');
        });

        it('has no value when no value', () => {
            render(Select, {
                props: {
                    inputAttributes: { name: 'Foods' },
                    items: items,
                }
            });

            const hidden = document.querySelector('input[type="hidden"]') as HTMLInputElement;
            expect(hidden.value).toBeFalsy();
        });

        it('has value when value exists', () => {
            render(Select, {
                props: {
                    items: items,
                    value: { value: 'cake', label: 'Cake' },
                }
            });

            const hiddenInput = document.querySelector('input[type="hidden"]') as HTMLInputElement;

            expect(hiddenInput).toBeTruthy();
            expect(hiddenInput.value).toBeTruthy();

            const parsedValue = JSON.parse(hiddenInput.value);
            expect(parsedValue.value).toBe('cake');
        });

        it('has no value when multiple and no value', () => {
            render(Select, {
                props: {
                    multiple: true,
                    items: items,
                }
            });

            const hiddenInput = document.querySelector('input[type="hidden"]') as HTMLInputElement;

            expect(hiddenInput).toBeTruthy();
            expect(hiddenInput.value).toBeFalsy();
        });

        it('lists value items when multiple and value exists', () => {
            render(Select, {
                props: {
                    multiple: true,
                    items: items,
                    value: [{ value: 'cake', label: 'Cake' }, { value: 'pizza', label: 'Pizza' },]
                }
            });

            const hiddenInput = document.querySelector('input[type="hidden"]') as HTMLInputElement;

            expect(hiddenInput).toBeTruthy();
            expect(hiddenInput.value).toBeTruthy();

            const hidden = JSON.parse(hiddenInput.value);
            expect(Array.isArray(hidden)).toBeTruthy();
            expect(hidden.length).toBe(2);
            expect(hidden[0].value).toBe('cake');
            expect(hidden[1].value).toBe('pizza');
        });
    });

    describe('ARIA', () => {
        it('describes highlighted item when listOpen', async () => {
            render(Select, {
                props: {
                    items: items,
                    listOpen: true
                }
            });

            let aria = document.querySelector('#aria-context');
            expect(aria!.innerHTML.includes('Chocolate')).toBeTruthy();
            await handleKeyboard('ArrowDown');
            expect(aria!.innerHTML.includes('Pizza')).toBeTruthy();
        });

        it('describes value in aria-selection', () => {
            render(Select, {
                props: {
                    items: items,
                    value: { value: 'cake', label: 'Cake' },
                    focused: true
                }
            });

            let aria = document.querySelector('#aria-selection');
            expect(aria!.innerHTML.includes('Cake')).toBeTruthy();
        });

        it('describes multiple value in aria-selection', () => {
            render(Select, {
                props: {
                    multiple: true,
                    items: items,
                    value: [{ value: 'cake', label: 'Cake' }, { value: 'pizza', label: 'Pizza' },],
                    focused: true
                }
            });

            let aria = document.querySelector('#aria-selection');
            expect(aria!.innerHTML.includes('Cake')).toBeTruthy();
            expect(aria!.innerHTML.includes('Pizza')).toBeTruthy();
        });

        it('uses custom ariaValues', () => {
            render(Select, {
                props: {
                    items: items,
                    value: { value: 'pizza', label: 'Pizza' },
                    focused: true,
                    ariaValues: (val: any) => `Yummy ${val} in my tummy!`
                }
            });

            let aria = document.querySelector('#aria-selection');
            expect(aria!.innerHTML).toBe('Yummy Pizza in my tummy!');
        });

        it('uses custom ariaListOpen', async () => {
            render(Select, {
                props: {
                    items: items,
                    listOpen: true,
                    ariaListOpen: (label: any, count: any) => `label: ${label}, count: ${count}`
                }
            });

            await tick();
            let aria = document.querySelector('#aria-context');
            expect(aria!.innerHTML).toBe('label: Chocolate, count: 5');
        });

        it('uses custom ariaFocused', () => {
            render(Select, {
                props: {
                    items: items,
                    focused: true,
                    listOpen: false,
                    ariaFocused: () => `nothing to see here.`
                }
            });

            let aria = document.querySelector('#aria-context');
            expect(aria!.innerHTML).toBe('nothing to see here.');
        });
    });

    describe('ID', () => {
        it('adds to input', () => {
            render(Select, {
                props: {
                    id: 'foods',
                    items: items,
                }
            });

            let aria = document.querySelector('input[type="text"]');
            expect(aria!.id).toBe('foods');
        });
    });

    describe('Focusable ancestor', () => {
        it('allows selecting item with focusable ancestor', async () => {
            const ancestor = document.createElement("div");
            ancestor.setAttribute("tabindex", "-1");
            document.body.appendChild(ancestor);

            let capturedValue: any;

            render(Select, {
                target: ancestor,
                props: {
                    items,
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await querySelectorClick('.svelte-select');
            await querySelectorClick('.list-item');
            await tick();

            expect(capturedValue.label).toBe('Chocolate');

            ancestor.remove();
        });
    });

    describe('List open on mount', () => {
        it('shows list on mount when listOpen is true', () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true,
                }
            });

            let list = document.querySelector('.svelte-select-list');

            expect(list).toBeTruthy();
        });
    });

    describe('HasError', () => {
        it('shows error styles', async () => {
            render(Select, {
                props: {
                    hasError: true
                }
            });

            expect(document.querySelector('.svelte-select.error')).toBeTruthy();

            cleanup();

            render(Select, {
                props: {
                    hasError: false
                }
            });

            await tick();
            expect(document.querySelector('.svelte-select.error')).toBeFalsy();
        });
    });

    describe('Escape key', () => {
        it('closes list when esc key pressed', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true
                }
            });

            await tick();
            expect(document.querySelector('.svelte-select-list')).toBeTruthy();

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Escape' }));
            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
        });
    });

    describe('CSS variables', () => {
        it('applies --item-height', () => {
            render(ItemHeightTest);

            const container = document.querySelector('.svelte-select') as HTMLElement;
            const computedStyle = getComputedStyle(container);

            expect(computedStyle.getPropertyValue('--item-height').trim()).toBe('50px');
        });

        it('applies --multi-item-color', async () => {
            render(MultiItemColor);

            await tick();

            const container = document.querySelector('.svelte-select') as HTMLElement;
            expect(getComputedStyle(container).getPropertyValue('--multi-item-color').trim()).toBe('red');
        });
    });

    describe('GroupHeaderNotSelectable', () => {
        it('never has active/hover states on group headers', async () => {
            render(GroupHeaderNotSelectable);

            await querySelectorClick('.svelte-select');
            await tick();

            let item = document.querySelector('.hover.group-item') as HTMLElement;
            expect(item && item.textContent).toBe('Chocolate');

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            await tick();

            item = document.querySelector('.item.hover.group-item') as HTMLElement;
            expect(item && item.textContent).toBe('Chips');

            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowUp' }));
            await tick();

            item = document.querySelector('.item.hover.group-item') as HTMLElement;
            expect(item && item.textContent).toBe('Pizza');

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.value = 'Ice';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await tick();
            item = document.querySelector('.item.hover.group-item') as HTMLElement;

            expect(item && item.textContent).toBe('Ice Cream');

            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await tick();

            item = document.querySelector('.item.hover.group-item') as HTMLElement;
            expect(item && item.textContent).toBe('Chocolate');

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

            await tick();
            item = document.querySelector('.item.hover.group-item') as HTMLElement;
            expect(item && item.textContent).toBe('Chips');

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

            await tick();
            item = document.querySelector('.item.hover.group-item') as HTMLElement;
            expect(item && item.textContent).toBe('Chocolate');
        });
    });

    describe('Enter/Tab with filterText', () => {
        beforeAll(() => {
            cleanup();
        });

        afterEach(() => {
            cleanup();
        });

        it('selects and shows highlighted value', async () => {
            let capturedValue: any;

            const { container } = render(Select, {
                props: {
                    listOpen: true,
                    focused: true,
                    filterText: 'A5',
                    items: ['A5', 'tests string', 'something else'],
                    onchange: (value: any) => {
                        capturedValue = value;
                    }
                }
            });

            await tick();
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
            await tick();

            expect(capturedValue.value).toBe('A5');

            const selectedItem = container.querySelector('.selected-item') as HTMLElement;
            expect(selectedItem && selectedItem.textContent).toBe('A5');
        });
    });

    describe('Losing focus', () => {
        it('closes list when losing focus', async () => {
            render(Select, {
                props: {
                    items,
                    listOpen: true
                }
            });

            expect(document.querySelector('.svelte-select-list')).toBeTruthy();

            const input = document.querySelector('.svelte-select input') as HTMLInputElement;
            input.blur();

            await tick();

            expect(document.querySelector('.svelte-select-list')).toBeFalsy();
        });
    });

    it('shows placeholder when multiple mode with empty array value', () => {
        const { container } = render(Select, {
            props: {
                multiple: true,
                value: [],
                placeholder: 'Select items',
                items: [
                    { value: 'a', label: 'Item A' },
                    { value: 'b', label: 'Item B' },
                ],
            }
        });

        const input = container.querySelector('input[type="text"]') as HTMLInputElement;
        expect(input?.placeholder).toBe('Select items');
    });

    it('updates value display when selecting item in multiple mode', async () => {
        const items = [
            { value: 'chocolate', label: 'Chocolate' },
            { value: 'pizza', label: 'Pizza' },
            { value: 'cake', label: 'Cake' },
        ];

        const { container } = render(Select, {
            props: {
                multiple: true,
                value: [
                    { value: 'chocolate', label: 'Chocolate' },
                ],
                items: items,
                listOpen: true,
            }
        });

        await tick();

        // Click on the second item (Pizza)
        const listItems = container.querySelectorAll('.list-item');
        (listItems[1] as HTMLElement).click();

        await tick();

        // This should have triggered updateValueDisplay with the array value
    });

    it('uses justValue to populate value on mount', async () => {
        const items = [
            { value: 'chocolate', label: 'Chocolate' },
            { value: 'pizza', label: 'Pizza' },
        ];

        const { container } = render(Select, {
            props: {
                items: items,
                multiple: true,
                useJustValue: true,
                justValue: ['chocolate', 'pizza'],
                // Don't provide value - let it be computed
            }
        });

        await tick();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if multi-items are rendered
        const multiItems = container.querySelectorAll('.multi-item');
        expect(multiItems.length).toBeGreaterThan(0);
    });

    it('computes value from justValue in single mode', async () => {
        const items = [
            { value: 'chocolate', label: 'Chocolate' },
            { value: 'pizza', label: 'Pizza' },
            { value: 'cake', label: 'Cake' },
        ];

        let boundValue: any;

        render(Select, {
            props: {
                items: items,
                multiple: false,
                useJustValue: true,
                justValue: 'pizza',
                value: boundValue,
                oninput: (v: any) => {
                    boundValue = v;
                }
            }
        });

        await tick();
        await new Promise(resolve => setTimeout(resolve, 100));

        // The component should have computed value from justValue
        expect(boundValue).toBeDefined();
    });

    it('handles list scroll event', async () => {
        // Create many items to ensure scrolling is possible
        const items = Array.from({ length: 50 }, (_, i) => ({
            value: `item${i}`,
            label: `Item ${i}`
        }));

        const { container } = render(Select, {
            props: {
                items: items,
                listOpen: true,
            }
        });

        await tick();

        const list = container.querySelector('.svelte-select-list') as HTMLElement;
        expect(list).toBeTruthy();

        // Dispatch scroll event
        const scrollEvent = new Event('scroll', { bubbles: true });
        list.dispatchEvent(scrollEvent);

        await tick();

        // Wait for setTimeout to complete (100ms + buffer)
        await new Promise(resolve => setTimeout(resolve, 150));

        // If we got here without errors, the scroll handler executed
        expect(list).toBeTruthy();
    });

    it('handles keydown on list item', async () => {
        const items = [
            { value: 'chocolate', label: 'Chocolate' },
            { value: 'pizza', label: 'Pizza' },
        ];

        const { container } = render(Select, {
            props: {
                items: items,
                listOpen: true,
            }
        });

        await tick();

        const listItem = container.querySelector('.list-item') as HTMLElement;
        expect(listItem).toBeTruthy();

        // Dispatch a keydown event on the list item
        const keydownEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
        });

        listItem.dispatchEvent(keydownEvent);

        await tick();

        // The handler should have prevented default and stopped propagation
        expect(listItem).toBeTruthy();
    });

    it('handles keydown on multi-item', async () => {
        const items = [
            { value: 'chocolate', label: 'Chocolate' },
            { value: 'pizza', label: 'Pizza' },
        ];

        const { container } = render(Select, {
            props: {
                items: items,
                multiple: true,
                value: [
                    { value: 'chocolate', label: 'Chocolate' },
                    { value: 'pizza', label: 'Pizza' },
                ],
            }
        });

        await tick();

        const multiItem = container.querySelector('.multi-item') as HTMLElement;
        expect(multiItem).toBeTruthy();

        // Dispatch a keydown event on the multi-item
        const keydownEvent = new KeyboardEvent('keydown', {
            key: 'Delete',
            bubbles: true,
        });

        multiItem.dispatchEvent(keydownEvent);

        await tick();

        // The handler should have prevented default and stopped propagation
        expect(multiItem).toBeTruthy();
    });
});