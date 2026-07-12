// Main component exports
export { default as Select } from './Select.svelte';

// Icon components
export { default as ChevronIcon } from './ChevronIcon.svelte';
export { default as ClearIcon } from './ClearIcon.svelte';
export { default as LoadingIcon } from './LoadingIcon.svelte';

// Utility functions
export { default as filter } from './filter';
export { useKeyboardNavigation } from './keyboard-navigation.svelte';

export { isStringArray, areItemsEqual, normalizeItem } from './utils';

// Type exports for TypeScript users
export type {
    ItemLike,
    SelectItem,
    SelectProps,
    SelectValue,
    SelectValueProp,
    JustValue,
    FloatingConfig,
    FilterConfig,
    SelectState,
    SelectErrorEvent,
    KeyboardNavigationState,
    KeyboardNavigationActions,
    ErrorEvent,
} from './types';
