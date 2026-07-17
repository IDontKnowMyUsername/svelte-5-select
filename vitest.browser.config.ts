import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Real-browser layout tests (pnpm run test:browser). Geometry — floating
// placement, list width, scroll-into-view — cannot be asserted under
// happy-dom, which has no layout engine.
export default defineConfig({
    plugins: [
        // Compiles src/lib/tailwind.css (the shipped Tailwind theme) for the
        // theme-parity axe scan in a11y-tailwind.test.ts
        tailwindcss(),
        svelte({
            compilerOptions: {
                hmr: false,
            },
            // runes:true only for our own files — deps ship legacy components
            // (e.g. @testing-library/svelte-core's wrapper scaffold) that must
            // stay in legacy mode to compile.
            dynamicCompileOptions({ filename }) {
                if (!filename.includes('node_modules')) return { runes: true };
            },
        }),
    ],
    optimizeDeps: {
        exclude: ['svelte-virtual-list'],
    },
    resolve: {
        alias: {
            $lib: path.resolve('./src/lib'),
        },
    },
    test: {
        globals: true,
        include: ['tests/browser/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }],
        },
    },
});
