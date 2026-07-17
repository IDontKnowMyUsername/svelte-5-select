/**
 * Compile-time type-level tests for the public generic types.
 *
 * There is no runtime here: these assertions are enforced by `pnpm run check`
 * (svelte-check type-checks `tests/**\/*.ts`). A failing `Expect<Equal<...>>`
 * surfaces as a type error, and each `// @ts-expect-error` must sit on a line
 * that genuinely errors or svelte-check fails with "unused @ts-expect-error".
 */
import type { Snippet } from 'svelte';
import type {
    FilterConfig,
    ItemLike,
    JustValue,
    SelectItem,
    SelectValue,
    SelectValueProp,
    SelectClearValue,
    SelectGroupHeader,
    SelectProps,
    SelectRow,
} from '$lib/types';
import { areItemsEqual, isGroupHeader, normalizeItem } from '$lib/utils';

// A sample item declared as an `interface` — crucially with NO index signature.
// Interfaces have no implicit index signature, so this proves the `ItemLike`
// bound (`Record<string, any>`) still accepts interface-shaped item types.
interface Country {
    code: string;
    name: string;
}

/** Strict, order-independent type equality (Matt Pocock / tsd style). */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// ---------------------------------------------------------------------------
// POSITIVE cases — these must compile.
// ---------------------------------------------------------------------------

// 1. Single mode resolves to a single item or null.
type _1 = Expect<Equal<SelectValue<Country, false>, Country | null>>;

// 2. Multiple mode resolves to an item array.
type _2 = Expect<Equal<SelectValue<Country, true>, Country[]>>;

// 3. The bindable prop shape in single mode also accepts a raw string id. It includes
//    `undefined` because that is what the component writes for an empty selection,
//    and `null` because an existing `bind:value={null}` must keep working on input.
type _3 = Expect<Equal<SelectValueProp<Country, false>, Country | string | null | undefined>>;

// 4. The bindable prop shape in multiple mode accepts item[] or string[] or empty.
type _4 = Expect<Equal<SelectValueProp<Country, true>, Country[] | string[] | null | undefined>>;

// 5. Default `Multiple` is `boolean`, so the conditional distributes over
//    `true | false` to the loose union `Item[] | Item | null`. The `Equal`
//    helper is order-independent, so member ordering here is not significant.
type _5 = Expect<Equal<SelectValue<Country>, Country[] | Country | null>>;

// 6. `Country` (interface, no index signature) satisfies the `ItemLike` bound.
type _Bound = Country extends ItemLike ? true : false;
type _6 = Expect<_Bound>;

// 7. `SelectClearValue` single mode: a single item / string id / null — no array.
type _7 = Expect<Equal<SelectClearValue<Country, false>, Country | string | null>>;

// 8. `SelectClearValue` multiple mode: the removed array (clear-all) plus the
//    single removed entry (one-tag removal), including raw string ids.
type _8 = Expect<Equal<SelectClearValue<Country, true>, Country[] | string[] | Country | string | null>>;

// 9. The `onclear` prop is wired to `SelectClearValue`, discriminated by `Multiple`:
//    single mode never surfaces an array.
type _9 = Expect<Equal<Parameters<NonNullable<SelectProps<Country, false>['onclear']>>[0], Country | string | null>>;
type _10 = Expect<
    Equal<
        Parameters<NonNullable<SelectProps<Country, true>['onclear']>>[0],
        Country[] | string[] | Country | string | null
    >
>;

// 11. The rendered-list surfaces expose `SelectRow`, not bare `Item`: `groupBy`
//     injects synthesized header rows that are NOT the user's item type.
type _11 = Expect<Equal<Parameters<NonNullable<SelectProps<Country, false>['onfilter']>>[0], SelectRow<Country>[]>>;

// 12. `isGroupHeader` narrows a row to the header in the true branch, and to the
//     user's own item type in the false branch — the whole point of the union.
declare const _row: SelectRow<Country>;
if (isGroupHeader(_row)) {
    type _12a = Expect<Equal<typeof _row, SelectGroupHeader>>;
} else {
    type _12b = Expect<Equal<typeof _row, Country>>;
}

// 13. A custom `filter` prop may return plain interface-typed items (8th audit:
//     the former `SelectItem[]` return type rejected `Country[]` for lacking an
//     index signature, contradicting the README's TypeScript promise)...
const _filter13a: NonNullable<SelectProps<Country>['filter']> = (config) =>
    (config.items as Country[]).filter((c) => c.name.startsWith(config.filterText));

// ...and the pipeline helpers' output stays returnable too (grouped rows are
// synthesized `SelectItem`s, not `Country`s).
const _filter13b: NonNullable<SelectProps<Country>['filter']> = (config) => config.applyGrouping([]);

// 14. The exported utils accept interface-typed items (9th audit: they were
//     typed `SelectItem`, so an interface with no index signature hit TS2345 —
//     the exact failure the `ItemLike` bound exists to prevent).
declare const _countryA: Country;
declare const _countryB: Country;
const _eq14: boolean = areItemsEqual(_countryA, _countryB, 'code');
const _norm14: Country | SelectItem | null = normalizeItem(_countryA);

// 15. `JustValue` admits `undefined` — the one empty representation every clear
//     path writes (9th audit: the union omitted it, so a `JustValue`-typed
//     variable bound to `bind:justValue` was violated at runtime on clear).
type _15 = Expect<Equal<Extract<JustValue, undefined>, undefined>>;

// 16. `onloaded` rows are `Item | SelectItem`: a string-resolving loader
//     delivers synthesized `{ value, label, index }` items, not the user's item
//     type, so the rows must be narrowed before reading item fields.
// @ts-expect-error a loaded option may be a synthesized SelectItem, whose fields are `unknown`
const _onloaded16: SelectProps<Country>['onloaded'] = (opts) => opts.map((o): string => o.code);

// 17. `NoInfer` on config callbacks (10th audit): a pre-annotated callback const
//     with a looser param type must not hijack `Item` inference — only `items`/
//     `value`/`loadOptions` drive it. TypeScript prefers contravariant (param)
//     candidates, so without `NoInfer` the loose `groupBy` below would flip
//     `Item` to `{ name?: string }` and fail the `Equal` pin. Simulated with a
//     generic function whose param is `SelectProps<Item>` — which is how Svelte
//     infers a component's generics from its props.
declare function _inferProps<Item extends ItemLike>(props: SelectProps<Item, false>): Item;
declare const _countries17: Country[];
const _looseGroupBy17 = (item: { name?: string }) => item.name ?? '';
const _inferred17 = _inferProps({ items: _countries17, groupBy: _looseGroupBy17 });
type _17 = Expect<Equal<typeof _inferred17, Country>>;

// ...and when the callback's param type is genuinely incompatible, the error
// lands on the offending callback prop — not on `items`/`loadOptions`.
const _wrongGroupBy17 = (item: { population: number }) => String(item.population);
const _inferred17b = _inferProps({
    items: _countries17,
    // @ts-expect-error the incompatible callback itself errors, not `items`
    groupBy: _wrongGroupBy17,
});
type _17b = Expect<Equal<typeof _inferred17b, Country>>;

// 18. The other NoInfer-guarded config callbacks are pinned too (11th audit:
//     only `groupBy` was pinned, so dropping `NoInfer` from these would have
//     passed the type suite). Loose-but-compatible consts must not hijack...
const _looseItemFilter18 = (label: string, filterText: string, option: { name?: string }) => !!option.name;
const _looseHeader18 = (groupValue: string, _item: { name?: string }) => ({ value: groupValue, label: groupValue });
const _inferred18 = _inferProps({
    items: _countries17,
    itemFilter: _looseItemFilter18,
    createGroupHeaderItem: _looseHeader18,
});
type _18 = Expect<Equal<typeof _inferred18, Country>>;

// ...and an incompatible one errors on itself, leaving `Item` unharmed.
const _wrongItemFilter18 = (label: string, filterText: string, option: { population: number }) => option.population > 0;
const _inferred18b = _inferProps({
    items: _countries17,
    // @ts-expect-error the incompatible callback itself errors, not `items`
    itemFilter: _wrongItemFilter18,
});
type _18b = Expect<Equal<typeof _inferred18b, Country>>;

// 19. `filter` (guarded via `FilterConfig<NoInfer<Item>>`): a filter const
//     annotated for a different item shape can no longer flip `Item`; the
//     error lands on `filter` itself.
const _looseFilter19 = (config: FilterConfig<{ name?: string }>) => config.applyGrouping([]);
const _inferred19 = _inferProps({
    items: _countries17,
    // @ts-expect-error the mismatched filter errors on itself, not `items`
    filter: _looseFilter19,
});
type _19 = Expect<Equal<typeof _inferred19, Country>>;

// ---------------------------------------------------------------------------
// NEGATIVE cases — each guarded line must be rejected by the compiler.
// ---------------------------------------------------------------------------

// 10. A row is not readable as the user's item until narrowed: this is exactly the
//     unsoundness the `SelectRow` union closes (a header has no `.code`).
declare const _rawRow: SelectRow<Country>;
// @ts-expect-error a list row may be a synthesized group header, which has no `code`
const _rowCode: string = _rawRow.code;

// 7. A single item is not assignable to a multiple-mode `value` slot (it wants
//    `Country[] | string[] | null`).
// @ts-expect-error single Country is not assignable to a multiple value (expects an array)
const _p7: SelectProps<Country, true>['value'] = { code: 'x', name: 'y' };

// 8. In multiple mode `onValueChange` receives `Country[]`; treating it as a single
//    item (`.name`) must error — arrays have no `name` property.
// @ts-expect-error value is Country[] in multiple mode, so `.name` does not exist
const _onValueChange8: SelectProps<Country, true>['onValueChange'] = (v) => v.name;

// 9. In single mode `onValueChange` receives `Country | null`; an unguarded `.name`
//    must error because the value may be null...
// @ts-expect-error value may be null, so `.name` requires a guard
const _onValueChange9a: SelectProps<Country, false>['onValueChange'] = (v) => v.name;

// ...while optional-chaining the null away is fine (no @ts-expect-error).
const _onValueChange9b: SelectProps<Country, false>['onValueChange'] = (v) => v?.name;

// ---------------------------------------------------------------------------
// 12th-audit pins: selectionSnippet NoInfer + honest FilterConfig.value
// ---------------------------------------------------------------------------
// 20. `selectionSnippet` (guarded via `NoInfer<Item>`): a pre-typed snippet const
//     with a looser item shape no longer hijacks `Item` — inference stays driven
//     by `items` (pre-fix this inferred `{ name?: string }`, so the Equal pin
//     failed); the looser snippet itself stays accepted (contravariance).
declare const _looseSelectionSnippet20: Snippet<[{ name?: string }, number?]>;
const _inferred20 = _inferProps({
    items: _countries17,
    selectionSnippet: _looseSelectionSnippet20,
});
type _20 = Expect<Equal<typeof _inferred20, Country>>;

// ...and an incompatible snippet errors on itself, not on `items`.
declare const _incompatSelectionSnippet20b: Snippet<[{ population: number }, number?]>;
const _inferred20b = _inferProps({
    items: _countries17,
    // @ts-expect-error the incompatible selection snippet errors on itself, not `items`
    selectionSnippet: _incompatSelectionSnippet20b,
});
type _20b = Expect<Equal<typeof _inferred20b, Country>>;

// 21. `FilterConfig.value` carries the consumer's `Item` type: the field admits
//     the consumer's items (and synthesized `SelectItem`s), and a narrowed entry
//     exposes its own fields without casts (`in` alone cannot exclude
//     `SelectItem` — its index signature admits any key — so narrow by typeof).
type _21 = Expect<
    Equal<FilterConfig<Country>['value'], Country | SelectItem | (Country | SelectItem)[] | null | undefined>
>;
const _filterValue21: FilterConfig<Country>['value'] = [
    { code: 'fr', name: 'France' },
    { value: 'synth', label: 'synth' },
];
const _readOwnField21 = (config: FilterConfig<Country>): string | undefined => {
    const entry = Array.isArray(config.value) ? config.value[0] : config.value;
    return entry && typeof entry.code === 'string' ? entry.code : undefined;
};
