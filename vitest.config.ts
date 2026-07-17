import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                hmr: !process.env.VITEST,
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
        conditions: ['browser'],
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        // tests/browser needs a real layout engine — run via vitest.browser.config.ts
        exclude: ['**/examples/**', 'tests/browser/**'],
        coverage: {
            provider: 'v8',
            // Vitest 4 dropped coverage.all: without an explicit include, only
            // files some test imports appear in the report, so a new source
            // file nothing imports would be invisible to the gate (0% covered,
            // CI green). Everything under src/lib is in scope; exclusions below
            // still apply on top.
            include: ['src/lib/**'],
            // Floors sit a few points below the current numbers (stmts ~97, branch
            // ~94, funcs ~97, lines ~99) so an unrelated change has headroom but a
            // real coverage regression fails CI. Ratchet these up as coverage rises.
            thresholds: {
                statements: 95,
                branches: 90,
                functions: 95,
                lines: 96,
            },
            exclude: [
                'docs/**',
                '**/*.config.*',
                '**/build/**',
                '**/*.d.ts',
                '**/dist/**',
                '**/examples/**',
                '**/.svelte-kit/**',
                'tests/**',
                '**/types.ts',
                'src/lib/index.ts',
                'src/lib/ChevronIcon.svelte',
                'src/lib/ClearIcon.svelte',
                'src/lib/LoadingIcon.svelte',
                'src/lib-example/**',
                'src/routes/**/*',
            ],
        },
    },
});
