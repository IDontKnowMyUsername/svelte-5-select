import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/**/*.{html,js,svelte,ts}'], // purge → content
    theme: {
        extend: {},
    },
    plugins: [],
};

export default config;
