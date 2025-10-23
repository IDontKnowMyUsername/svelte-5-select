import type { KeyboardNavigationContext } from './types';
export declare function useKeyboardNavigation(context: KeyboardNavigationContext): {
    handleKeyDown: (e: KeyboardEvent) => void;
    handleEscapeKey: (e: KeyboardEvent) => void;
    handleEnterKey: (e: KeyboardEvent) => void;
    handleArrowDownKey: (e: KeyboardEvent) => void;
    handleArrowUpKey: (e: KeyboardEvent) => void;
    handleTabKey: (e: KeyboardEvent) => void;
    handleBackspaceKey: (e: KeyboardEvent) => void;
    handleArrowLeftKey: (e: KeyboardEvent) => void;
    handleArrowRightKey: (e: KeyboardEvent) => void;
};
