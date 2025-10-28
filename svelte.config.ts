import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import type { Config } from '@sveltejs/kit';

const config: Config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter(),
        alias: {
            '$lib': 'src/lib',
            '$lib/*': 'src/lib/*'
        }
    }
};

export default config;