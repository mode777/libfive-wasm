// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'build/**',
            'vendor/**',
            'node_modules/**',
            'openspec/**',
            // Build/test harness from the wasm-build-pipeline change: plain
            // Node scripts outside the package source tree.
            'scripts/**',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
        rules: {
            // Emscripten module keys are underscore-prefixed by design.
            '@typescript-eslint/no-unsafe-function-type': 'off',
        },
    },
);
