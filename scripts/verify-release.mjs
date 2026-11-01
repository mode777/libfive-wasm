#!/usr/bin/env node
/*
 * scripts/verify-release.mjs — post-publish verification (AD-027).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Checks the registry for the released version, tarball integrity and
 * provenance attestation, then installs that exact version into a clean
 * project and meshes + exports STL. Requires network access and a published
 * package; it is not part of `npm test`.
 *
 * Usage: node scripts/verify-release.mjs [version]
 * Keep the temp project: KEEP_RELEASE_TEST=1
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const version =
    process.argv[2] ??
    JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;

function fail(message) {
    console.error(`verify-release: ${message}`);
    process.exit(1);
}

function vendorCommit() {
    const lock = readFileSync(path.join(REPO_ROOT, 'vendor', 'libfive.lock'), 'utf8');
    const match = /^commit=([0-9a-f]{40})$/m.exec(lock);
    if (!match?.[1]) fail('vendor/libfive.lock has no pinned commit');
    return match[1];
}

console.log(`verify-release: checking libfive-wasm@${version}`);
console.log(`verify-release: vendor pin ${vendorCommit()}`);

const view = spawnSync(
    NPM,
    [
        'view',
        `libfive-wasm@${version}`,
        'version',
        'dist.integrity',
        'dist.attestations',
        '--json',
    ],
    { cwd: REPO_ROOT, encoding: 'utf8', env: process.env },
);
if (view.error) fail(String(view.error));
if ((view.status ?? 1) !== 0) {
    fail(
        `libfive-wasm@${version} is not available on the registry ` +
            `(npm view exited ${view.status}): ${(view.stderr ?? '').trim()}`,
    );
}

let metadata;
try {
    metadata = JSON.parse(view.stdout);
} catch (err) {
    fail(`could not parse npm view output: ${String(err)}\n${view.stdout}`);
}
if (!metadata || typeof metadata !== 'object') {
    fail('npm view returned no metadata');
}
const data = Array.isArray(metadata) ? metadata[0] : metadata;
if (data.version !== version) {
    fail(`registry reports version ${data.version}, expected ${version}`);
}
const integrity = data['dist.integrity'];
if (typeof integrity !== 'string' || integrity.length === 0) {
    fail('registry metadata has no dist.integrity');
}
const attestations = data['dist.attestations'];
if (!attestations) {
    fail('registry metadata has no dist.attestations (provenance)');
}
console.log(`verify-release: integrity ${integrity}`);
console.log(
    `verify-release: attestations ${
        typeof attestations === 'string' ? attestations : JSON.stringify(attestations)
    }`,
);

const scratch = mkdtempSync(path.join(os.tmpdir(), 'libfive-release-'));
let keep = process.env.KEEP_RELEASE_TEST === '1';
try {
    writeFileSync(
        path.join(scratch, 'package.json'),
        `${JSON.stringify(
            { name: 'libfive-release-consumer', private: true, type: 'module' },
            null,
            2,
        )}\n`,
    );
    execFileSync(
        NPM,
        [
            'install',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
            '--no-package-lock',
            `libfive-wasm@${version}`,
        ],
        { cwd: scratch, stdio: 'inherit' },
    );
    writeFileSync(
        path.join(scratch, 'check.mjs'),
        `import { init, exportSTL } from 'libfive-wasm';

const libfive = await init();
const shape = libfive.sphere(1);
const mesh = shape.mesh({
    region: { min: [-1.5, -1.5, -1.5], max: [1.5, 1.5, 1.5] },
    res: 8,
});
if (mesh.vertCount <= 0 || mesh.triCount <= 0) {
    throw new Error(\`empty mesh: \${mesh.vertCount} verts / \${mesh.triCount} tris\`);
}
const stl = exportSTL(mesh);
if (stl.byteLength !== 84 + mesh.triCount * 50) {
    throw new Error(\`unexpected STL size \${stl.byteLength}\`);
}
console.log(\`registry consumer meshed \${mesh.vertCount} verts / \${mesh.triCount} tris\`);
mesh.free();
shape.free();
`,
    );
    const output = execFileSync(process.execPath, ['check.mjs'], {
        cwd: scratch,
        encoding: 'utf8',
    });
    process.stdout.write(output);
    if (!existsSync(path.join(scratch, 'node_modules', 'libfive-wasm', 'dist', 'libfive.wasm'))) {
        fail('installed package has no dist/libfive.wasm');
    }
    console.log(`verify-release: libfive-wasm@${version} verified`);
} catch (err) {
    keep = true;
    console.error(`verify-release: FAILED (temp project kept at ${scratch})`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
} finally {
    if (!keep) rmSync(scratch, { recursive: true, force: true });
}
