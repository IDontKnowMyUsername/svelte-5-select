/**
 * Compile-time type-level tests for the public generic types.
 *
 * There is no runtime here: these assertions are enforced by `pnpm run check`
 * (svelte-check type-checks `tests/**\/*.ts`). A failing `Expect<Equal<...>>`
 * surfaces as a type error, and each `// @ts-expect-error` must sit on a line
 * that genuinely errors or svelte-check fails with "unused @ts-expect-error".
 */
import type { ItemLike, SelectValue, SelectValueProp, SelectProps } from '$lib/types';

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

// 3. The bindable prop shape in single mode also accepts a raw string id.
type _3 = Expect<Equal<SelectValueProp<Country, false>, Country | string | null>>;

// 4. The bindable prop shape in multiple mode accepts item[] or string[] or null.
type _4 = Expect<Equal<SelectValueProp<Country, true>, Country[] | string[] | null>>;

// 5. Default `Multiple` is `boolean`, so the conditional distributes over
//    `true | false` to the loose union `Item[] | Item | null`. The `Equal`
//    helper is order-independent, so member ordering here is not significant.
type _5 = Expect<Equal<SelectValue<Country>, Country[] | Country | null>>;

// 6. `Country` (interface, no index signature) satisfies the `ItemLike` bound.
type _Bound = Country extends ItemLike ? true : false;
type _6 = Expect<_Bound>;

// ---------------------------------------------------------------------------
// NEGATIVE cases — each guarded line must be rejected by the compiler.
// ---------------------------------------------------------------------------

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
