import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                hmr: !process.env.VITEST,
                runes: true
            }
        })
    ],
    optimizeDeps: {
        exclude: ['svelte-virtual-list']
    },
    resolve: {
        alias: {
            $lib: path.resolve('./src/lib')
        },
        conditions: ['browser']
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        exclude: ['**/examples/**'],
        coverage: {
            provider: 'v8',
            exclude: [
                'docs/**',
                '**/*.config.*',
                '**/build/**',
                '**/*.d.ts',
                '**/dist/**',
                '**/examples/**',
                '**/.svelte-kit/**',
                'src/remove-styles.ts',
                'src/post-prepare.ts',
                'tests/**',
                '**/types.ts',
                'src/lib/index.ts',
                'src/lib/ChevronIcon.svelte',
                'src/lib/ClearIcon.svelte',
                'src/lib/LoadingIcon.svelte',
                'src/routes/**/*'
            ],
        }
    }
});