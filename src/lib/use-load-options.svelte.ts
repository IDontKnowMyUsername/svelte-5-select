import type { LoadOptionsContext, SelectItem } from './types';

export function useLoadOptions(context: LoadOptionsContext) {
    function handleLoadOptions(currentFilterText: string, currentDeps: any[]) {
        const { loadOptions, disabled, multiple, value, itemId, useJustValue, justValue, prevFilterText, debounceWait, listOpen } = context.getState();

        if (loadOptions && !disabled) {
            context.setLoading(true);

            const isFilterTextChange = currentFilterText !== prevFilterText;

            const executeLoad = async () => {
                try {
                    const result = await loadOptions(currentFilterText);

                    if (result && result.length > 0 && typeof result[0] === 'string') {
                        context.setItems(context.convertStringItemsToObjects(result as string[]));
                    } else {
                        context.setItems(result ? (result.slice() as SelectItem[]) : null);
                    }

                    // Re-read state after async operation
                    const state = context.getState();

                    if (state.value && state.items && (state.items as any[]).length > 0) {
                        const items = state.items as SelectItem[];
                        const valueExists = state.multiple
                            ? Array.isArray(state.value) && state.value.every((v: any) =>
                                items.some((item: any) =>
                                    (typeof item === 'string' ? item : item[state.itemId]) === (typeof v === 'string' ? v : v[state.itemId])
                                )
                            )
                            : items.some((item: any) =>
                                (typeof item === 'string' ? item : item[state.itemId]) === (typeof state.value === 'string' ? state.value : (state.value as any)[state.itemId])
                            );

                        if (!valueExists) {
                            context.setValue(state.multiple ? [] : undefined);
                            if (state.useJustValue) {
                                context.setJustValue(state.multiple ? [] : '');
                            }
                        }
                    } else if (state.value && (!state.items || (state.items as any[]).length === 0)) {
                        context.setValue(state.multiple ? [] : undefined);
                    }

                    context.setLoading(false);
                    const finalState = context.getState();
                    context.onloaded(((finalState.items as SelectItem[]) || []) as SelectItem[]);
                } catch (err) {
                    console.error('loadOptions error:', err);
                    context.onerror({ type: 'loadOptions', details: err });
                    context.setItems(null);
                    context.setLoading(false);
                }
            };

            if (isFilterTextChange) {
                context.debounce(executeLoad, debounceWait);
            } else {
                executeLoad();
            }

            if (currentFilterText.length > 0 && !listOpen) {
                context.setListOpen(true);
            }
        } else if (loadOptions && disabled) {
            const state = context.getState();
            if (state.value || (state.useJustValue && state.justValue)) {
                context.setValue(state.multiple ? [] : undefined);
                if (state.useJustValue) {
                    context.setJustValue(state.multiple ? [] : '');
                }
            }
            context.setItems(null);
        }
    }

    return {
        handleLoadOptions,
    };
}
