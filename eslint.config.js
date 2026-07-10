import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs.recommended,
    prettier,
    ...svelte.configs.prettier,
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            // Items are consumer-defined shapes; the public API is deliberately loosely typed
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            // Consumer items carry no guaranteed unique key; unkeyed each is intentional upstream behavior
            'svelte/require-each-key': 'off',
        },
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
        languageOptions: {
            parserOptions: {
                parser: ts.parser,
            },
        },
        rules: {
            // Bare signal reads are the tracked-trigger idiom used with untrack() in $effect bodies
            '@typescript-eslint/no-unused-expressions': 'off',
        },
    },
    {
        files: ['src/routes/**'],
        rules: {
            // Demo app served from the root; base-path-safe links are not needed
            'svelte/no-navigation-without-resolve': 'off',
        },
    },
    {
        ignores: [
            'dist/',
            'package/',
            '.svelte-kit/',
            'src/lib/no-styles/',
            'tests/public/',
            'docs/',
            'static/',
            'coverage/',
        ],
    },
);
