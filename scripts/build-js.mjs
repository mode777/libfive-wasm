#!/usr/bin/env node
/*
 * scripts/build-js.mjs — build the package entry and declarations (AD-026).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Runs after `emcc` has produced dist/libfive.js + dist/libfive.wasm:
 *   1. esbuild bundles src/index.ts with the Emscripten factory inlined into
 *      dist/index.js (so new URL('libfive.wasm', import.meta.url) is a static
 *      bundler-visible asset reference);
 *   2. tsc emits the declaration tree (dist/index.d.ts and references).
 *
 * Usage: node scripts/build-js.mjs
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(REPO_ROOT, 'dist');
const GLUE = path.join(DIST, 'libfive.js');
const TSC = path.join(REPO_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

function fail(message) {
    console.error(`build-js: ${message}`);
    process.exit(1);
}

if (!existsSync(GLUE)) {
    fail('dist/libfive.js is missing; run scripts/build-wasm.sh first');
}
if (!existsSync(TSC)) {
    fail('typescript is not installed; run `npm ci`');
}

const entry = `
import createLibfiveModule from ${JSON.stringify(GLUE)};
import { initFromFactory } from ${JSON.stringify(path.join(REPO_ROOT, 'src', 'loader', 'index.ts'))};
export * from ${JSON.stringify(path.join(REPO_ROOT, 'src', 'index.ts'))};

export async function init(options = {}) {
    return initFromFactory(createLibfiveModule, options);
}
`;

await build({
    stdin: {
        contents: entry,
        resolveDir: REPO_ROOT,
        sourcefile: 'package-entry.ts',
        loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    // Emscripten's Node branches are guarded at runtime; keep the built-ins
    // external so one bundle still works in both Node and browsers.
    external: ['module', 'fs', 'path', 'url'],
    legalComments: 'none',
    outfile: path.join(DIST, 'index.js'),
    logLevel: 'warning',
});

const tsc = spawnSync(process.execPath, [TSC, '-p', 'tsconfig.build.json'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
});
if (tsc.error) fail(String(tsc.error));
if ((tsc.status ?? 1) !== 0) fail(`tsc exited ${tsc.status}`);

const required = ['index.js', 'index.d.ts', 'libfive.wasm'];
for (const file of required) {
    if (!existsSync(path.join(DIST, file))) fail(`dist/${file} was not produced`);
}
console.log('build-js: wrote dist/index.js and the declaration tree');
