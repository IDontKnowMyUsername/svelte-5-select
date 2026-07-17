/**
 * Compile-time type-level tests for the public generic types.
 *
 * There is no runtime here: these assertions are enforced by `pnpm run check`
 * (svelte-check type-checks `tests/**\/*.ts`). A failing `Expect<Equal<...>>`
 * surfaces as a type error, and each `// @ts-expect-error` must sit on a line
 * that genuinely errors or svelte-check fails with "unused @ts-expect-error".
 */
import type {
    ItemLike,
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

// 8. In multiple mode `oninput` receives `Country[]`; treating it as a single
//    item (`.name`) must error — arrays have no `name` property.
// @ts-expect-error value is Country[] in multiple mode, so `.name` does not exist
const _oninput8: SelectProps<Country, true>['oninput'] = (v) => v.name;

// 9. In single mode `oninput` receives `Country | null`; an unguarded `.name`
//    must error because the value may be null...
// @ts-expect-error value may be null, so `.name` requires a guard
const _oninput9a: SelectProps<Country, false>['oninput'] = (v) => v.name;

// ...while optional-chaining the null away is fine (no @ts-expect-error).
const _oninput9b: SelectProps<Country, false>['oninput'] = (v) => v?.name;
