import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path, { resolve } from 'path';

export default defineConfig({
    plugins: [svelte()],
    optimizeDeps: {
        exclude: ['svelte-virtual-list']
    },
    resolve: {
        alias: {
            $lib: path.resolve('./src/lib')
        }
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/lib/index.ts'),
            name: 'SvelteSelect',
            fileName: (format) => `svelte-select.${format}.js`
        },
        rollupOptions: {
            external: ['svelte', 'svelte/internal'],
            output: {
                globals: {
                    svelte: 'Svelte'
                }
            }
        }
    }
});