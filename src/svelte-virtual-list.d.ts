declare module 'svelte-virtual-list' {
    import type { SvelteComponent } from 'svelte';

    export interface VirtualListProps {
        items: any[];
        height: number | string;
        itemHeight: number;
    }

    export default class VirtualList extends SvelteComponent<VirtualListProps> {}
}