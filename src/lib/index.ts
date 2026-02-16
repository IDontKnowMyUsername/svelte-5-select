// Main component exports
export { default as Select } from './Select.svelte';

// Icon components
export { default as ChevronIcon } from './ChevronIcon.svelte';
export { default as ClearIcon } from './ClearIcon.svelte';
export { default as LoadingIcon } from './LoadingIcon.svelte';

// Utility functions
export { default as filter } from './filter';
export { useKeyboardNavigation } from './keyboard-navigation.svelte';

export { isStringArray, isCancelled, areItemsEqual } from './utils';

// Type exports for TypeScript users
export type {
    SelectItem,
    SelectProps,
    SelectValue,
    JustValue,
    FloatingConfig,
    FilterConfig,
    KeyboardNavigationContext,
    ErrorEvent,
} from './types';