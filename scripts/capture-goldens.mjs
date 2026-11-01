#!/usr/bin/env node
/*
 * scripts/capture-goldens.mjs — recapture the checked-in golden meshes
 * (AD-025).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Run only against a reviewed release artifact (`scripts/build-wasm.sh`).
 * The normal test suite never writes goldens; this script is the one writer.
 *
 * Usage: node scripts/capture-goldens.mjs
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WASM = path.join(REPO_ROOT, 'dist', 'libfive.wasm');
const VITEST = path.join(REPO_ROOT, 'node_modules', 'vitest', 'vitest.mjs');
const LOCK = path.join(REPO_ROOT, 'vendor', 'libfive.lock');

function fail(message) {
    console.error(`capture-goldens: ${message}`);
    process.exit(1);
}

if (!existsSync(WASM)) {
    fail(
        'dist/libfive.wasm is missing; build the release artifact first ' +
            '(scripts/build-wasm.sh, locally on the verification server)',
    );
}
if (!existsSync(VITEST)) {
    fail('vitest is not installed; run `npm ci` first');
}

const lock = readFileSync(LOCK, 'utf8');
const commit = /^commit=([0-9a-f]{40})$/m.exec(lock)?.[1];
if (!commit) fail(`no pinned commit in ${LOCK}`);

const digest = createHash('sha256').update(readFileSync(WASM)).digest('hex');
console.log(`capture-goldens: vendor pin ${commit}`);
console.log(`capture-goldens: wasm sha256 ${digest}`);
console.log('capture-goldens: writing tests/goldens/*.json (review the diff)');

const result = spawnSync(process.execPath, [VITEST, 'run', 'tests/golden.test.ts'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, GOLDEN_CAPTURE: '1' },
});
if (result.error) fail(String(result.error));
process.exit(result.status ?? 1);
