// Main component exports
export { default as Select } from './Select.svelte';

// Icon components
export { default as ChevronIcon } from './ChevronIcon.svelte';
export { default as ClearIcon } from './ClearIcon.svelte';
export { default as LoadingIcon } from './LoadingIcon.svelte';

// Utility functions
export { default as filter } from './filter';
export { isStringArray, areItemsEqual, normalizeItem } from './utils';

// Type exports for TypeScript users.
// Note: SelectState, KeyboardNavigationState/Actions and the useKeyboardNavigation
// composable are intentionally NOT exported — they are internal wiring, not a
// supported extension point.
export type {
    ItemLike,
    SelectItem,
    SelectProps,
    SelectValue,
    SelectValueProp,
    SelectClearValue,
    JustValue,
    FloatingConfig,
    FilterConfig,
    SelectErrorEvent,
    ErrorEvent,
} from './types';
