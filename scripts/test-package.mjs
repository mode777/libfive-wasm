#!/usr/bin/env node
/*
 * scripts/test-package.mjs — consumer verification of the npm tarball (AD-026).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Packs the real tarball, installs it into a scratch project, meshes from
 * Node, typechecks against the packaged declarations, and builds a Vite app
 * that imports the installed package. No registry access is required.
 *
 * Usage: node scripts/test-package.mjs
 * Keep the scratch tree for inspection: KEEP_PACKAGE_TEST=1
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_ENTRY = path.join(REPO_ROOT, 'dist', 'index.js');
const DIST_TYPES = path.join(REPO_ROOT, 'dist', 'index.d.ts');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function fail(message) {
    console.error(`test-package: ${message}`);
    process.exit(1);
}

function run(command, args, options = {}) {
    return execFileSync(command, args, {
        cwd: options.cwd ?? REPO_ROOT,
        encoding: 'utf8',
        stdio: options.stdio ?? 'pipe',
        env: process.env,
    });
}

if (!existsSync(DIST_ENTRY) || !existsSync(DIST_TYPES)) {
    fail('dist/index.js and dist/index.d.ts are missing; run scripts/build-wasm.sh');
}
if (!existsSync(path.join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js'))) {
    fail('vite is not installed; run `npm ci`');
}

const scratch = mkdtempSync(path.join(os.tmpdir(), 'libfive-package-'));
const packDir = path.join(scratch, 'pack');
const project = path.join(scratch, 'project');
let keep = process.env.KEEP_PACKAGE_TEST === '1';

try {
    console.log(`test-package: scratch ${scratch}`);
    execFileSync('mkdir', ['-p', packDir, project, path.join(project, 'src')]);
    execFileSync(NPM, ['pack', '--ignore-scripts', '--pack-destination', packDir], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
    });
    const tarball = readdirSync(packDir).find((file) => file.endsWith('.tgz'));
    if (!tarball) fail(`npm pack produced no tarball in ${packDir}`);
    const listing = execFileSync('tar', ['tzf', path.join(packDir, tarball)], {
        encoding: 'utf8',
    });
    for (const required of [
        'package/dist/index.js',
        'package/dist/index.d.ts',
        'package/dist/libfive.wasm',
        'package/README.md',
        'package/LICENSE',
    ]) {
        if (!listing.split('\n').includes(required)) {
            fail(`tarball is missing ${required}`);
        }
    }
    if (listing.includes('package/dist/debug/')) {
        fail('tarball contains the debug artifact');
    }
    if (listing.includes('package/src/') || listing.includes('package/tests/')) {
        fail('tarball contains repository sources or tests');
    }
    const manifest = JSON.parse(
        readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
    );
    if (manifest.dependencies && Object.keys(manifest.dependencies).length > 0) {
        fail('package.json declares runtime dependencies');
    }
    console.log(`test-package: packed ${tarball}`);

    writeFileSync(
        path.join(project, 'package.json'),
        `${JSON.stringify(
            { name: 'libfive-package-consumer', private: true, type: 'module' },
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
            path.join(packDir, tarball),
        ],
        { cwd: project, stdio: 'inherit' },
    );

    // --- Node consumer -----------------------------------------------------
    writeFileSync(
        path.join(project, 'check.mjs'),
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
console.log(\`node consumer meshed \${mesh.vertCount} verts / \${mesh.triCount} tris\`);
mesh.free();
shape.free();
`,
    );
    const nodeOut = run(process.execPath, ['check.mjs'], { cwd: project });
    process.stdout.write(nodeOut);

    // --- TypeScript consumer ----------------------------------------------
    writeFileSync(
        path.join(project, 'check.ts'),
        `import { init, exportSTL } from 'libfive-wasm';
import type { Mesh, Shape } from 'libfive-wasm';

export async function run(): Promise<number> {
    const libfive = await init();
    const shape: Shape = libfive.sphere(1);
    const mesh: Mesh = shape.mesh({
        region: { min: [-1, -1, -1], max: [1, 1, 1] },
        res: 4,
    });
    const buffer: ArrayBuffer = exportSTL(mesh);
    mesh.free();
    shape.free();
    return buffer.byteLength;
}
`,
    );
    writeFileSync(
        path.join(project, 'tsconfig.json'),
        `${JSON.stringify(
            {
                compilerOptions: {
                    target: 'es2022',
                    module: 'nodenext',
                    moduleResolution: 'nodenext',
                    strict: true,
                    noEmit: true,
                    skipLibCheck: false,
                },
                include: ['check.ts'],
            },
            null,
            2,
        )}\n`,
    );
    run(process.execPath, [
        path.join(REPO_ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
        '-p',
        path.join(project, 'tsconfig.json'),
    ]);
    console.log('test-package: TypeScript consumer typechecks');

    // --- Vite consumer -----------------------------------------------------
    writeFileSync(
        path.join(project, 'index.html'),
        '<!doctype html><html><body><script type="module" src="/src/main.js"></script></body></html>\n',
    );
    writeFileSync(
        path.join(project, 'src', 'main.js'),
        `import { init } from 'libfive-wasm';

const libfive = await init();
const shape = libfive.sphere(1);
const mesh = shape.mesh({
    region: { min: [-1.5, -1.5, -1.5], max: [1.5, 1.5, 1.5] },
    res: 8,
});
globalThis.__libfiveResult = { verts: mesh.vertCount, tris: mesh.triCount };
mesh.free();
shape.free();
`,
    );
    run(
        process.execPath,
        [
            path.join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
            'build',
            '--logLevel',
            'warn',
        ],
        { cwd: project, stdio: 'inherit' },
    );
    const assets = path.join(project, 'dist', 'assets');
    const emitted = existsSync(assets) ? readdirSync(assets) : [];
    if (!emitted.some((file) => file.endsWith('.wasm'))) {
        fail(`Vite build did not emit a wasm asset (assets: ${emitted.join(', ')})`);
    }
    const bundle = readFileSync(
        path.join(project, 'dist', 'index.html'),
        'utf8',
    );
    if (!bundle.includes('assets/')) fail('Vite build produced no JS asset reference');
    console.log(`test-package: Vite build emitted ${emitted.join(', ')}`);
} catch (err) {
    keep = true;
    console.error(`test-package: FAILED (scratch kept at ${scratch})`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
} finally {
    if (!keep) rmSync(scratch, { recursive: true, force: true });
}
