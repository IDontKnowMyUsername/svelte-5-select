import type { SelectItem } from './types';
interface AriaHandlersConfig {
    ariaValues: (values: string) => string;
    ariaListOpen: (label: string, count: number) => string;
    ariaFocused: () => string;
}
interface AriaHandlersContext {
    value: string | SelectItem | SelectItem[] | null | undefined;
    filteredItems: SelectItem[];
    hoverItemIndex: number;
    listOpen: boolean;
    multiple: boolean;
    label: string;
}
export declare function useAriaHandlers(config: AriaHandlersConfig): {
    handleAriaSelection: (context: AriaHandlersContext) => string;
    handleAriaContent: (context: AriaHandlersContext) => string;
};
export {};
