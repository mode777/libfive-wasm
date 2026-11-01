/*
libfive-wasm smoke test: import the artifact, build a sphere, mesh it.

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
    REPO_ROOT,
    heaps,
    loadArtifact,
    opcode,
    parseArtifactArgs,
} from './lib/wasm-test-utils.mjs';

const args = parseArtifactArgs(process.argv.slice(2));
const module = await loadArtifact(args);
const { f32, u32 } = heaps(module);

let failures = 0;
function check(name, fn) {
    try {
        fn();
        console.log(`ok - ${name}`);
    } catch (err) {
        failures++;
        console.error(`not ok - ${name}: ${err.message}`);
    }
}

// ---------------------------------------------------------------------------
// Export surface: every manifested symbol must be callable.
// ---------------------------------------------------------------------------

const manifestPath = path.join(REPO_ROOT, 'wasm', 'exports.txt');
const manifest = readFileSync(manifestPath, 'utf8')
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean);

check('manifest symbols are exported', () => {
    for (const symbol of manifest) {
        assert.equal(
            typeof module[symbol], 'function',
            `${symbol} is not callable on the module`);
    }
});

check('stdlib symbols are exported', () => {
    // LIBFIVE_ALIAS macros (box, cube, torus, ...) are C macros, not symbols;
    // the underlying LIBFIVE_STDLIB functions are what the artifact exports.
    for (const symbol of ['_emptiness', '_sphere', '_box_mitered', '__union']) {
        assert.equal(
            typeof module[symbol], 'function',
            `${symbol} is not exported`);
    }
});

check('generated stdlib shims are exported and callable', () => {
    // AD-024: flat wrappers cover every declaration, including the
    // struct-by-value entry points JavaScript cannot call directly.
    for (const symbol of [
        '_shim_stdlib_sphere',
        '_shim_stdlib_loft_between',
        '_shim_stdlib_text',
    ]) {
        assert.equal(
            typeof module[symbol], 'function',
            `${symbol} is not exported`);
    }
    const empty = module._shim_stdlib_emptiness();
    assert.ok(empty, 'shim_stdlib_emptiness returned null');
    module._libfive_tree_delete(empty);
});

// ---------------------------------------------------------------------------
// Raw tree construction helpers.
// ---------------------------------------------------------------------------

const trees = [];
function track(ptr) {
    assert.ok(ptr, 'tree construction returned null');
    trees.push(ptr);
    return ptr;
}

const opAdd = opcode(module, 'add');
const opSub = opcode(module, 'sub');
const opMul = opcode(module, 'mul');
const opSqrt = opcode(module, 'sqrt');

const x = track(module._libfive_tree_x());
const y = track(module._libfive_tree_y());
const z = track(module._libfive_tree_z());
const one = track(module._libfive_tree_const(1));

const pointPtr = module._malloc(12);
const regionPtr = module._malloc(24);
const intervalPtr = module._malloc(8);
const derivPtr = module._malloc(12);

function setPoint(px, py, pz) {
    module._shim_vec3_set(pointPtr, px, py, pz);
}

function setRegion(x0, x1, y0, y1, z0, z1) {
    module._shim_region3_set(regionPtr, x0, x1, y0, y1, z0, z1);
}

// ---------------------------------------------------------------------------
// A sphere built from raw opcodes: sqrt(x^2 + y^2 + z^2) - 1.
// ---------------------------------------------------------------------------

const x2 = track(module._libfive_tree_binary(opMul, x, x));
const y2 = track(module._libfive_tree_binary(opMul, y, y));
const z2 = track(module._libfive_tree_binary(opMul, z, z));
const sum = track(module._libfive_tree_binary(opAdd,
    track(module._libfive_tree_binary(opAdd, x2, y2)), z2));
const radius = track(module._libfive_tree_unary(opSqrt, sum));
const sphere = track(module._libfive_tree_binary(opSub, radius, one));

check('eval_f has the right sign inside and outside', () => {
    setPoint(0, 0, 0);
    assert.ok(Math.abs(module._shim_tree_eval_f(sphere, pointPtr) + 1) < 1e-5);
    setPoint(2, 0, 0);
    assert.ok(Math.abs(module._shim_tree_eval_f(sphere, pointPtr) - 1) < 1e-5);
});

check('eval_r returns negative bounds well inside the sphere', () => {
    setRegion(-0.5, 0.5, -0.5, 0.5, -0.5, 0.5);
    module._shim_tree_eval_r(sphere, regionPtr, intervalPtr);
    const [lo, hi] = f32(intervalPtr, 2);
    assert.ok(lo <= hi, `bounds inverted: [${lo}, ${hi}]`);
    assert.ok(hi < 0, `region inside the sphere returned [${lo}, ${hi}]`);
});

check('eval_d returns the outward gradient at the surface', () => {
    setPoint(1, 0, 0);
    module._shim_tree_eval_d(sphere, pointPtr, derivPtr);
    const [dx, dy, dz] = f32(derivPtr, 3);
    assert.ok(Math.abs(dx - 1) < 1e-3, `dx=${dx}`);
    assert.ok(Math.abs(dy) < 1e-3, `dy=${dy}`);
    assert.ok(Math.abs(dz) < 1e-3, `dz=${dz}`);
});

check('tree_print round-trips through a C string', () => {
    const strPtr = module._libfive_tree_print(sphere);
    try {
        assert.ok(strPtr, 'libfive_tree_print returned null');
        const text = module.UTF8ToString(strPtr);
        assert.ok(text.length > 0, 'libfive_tree_print returned an empty string');
        assert.ok(text.includes('sqrt'), `unexpected print: ${text}`);
    } finally {
        module._libfive_free_str(strPtr);
    }
});

check('the flat stdlib emptiness() is callable and infinite', () => {
    const empty = module._emptiness();
    track(empty);
    setPoint(0, 0, 0);
    const value = module._shim_tree_eval_f(empty, pointPtr);
    assert.equal(value, Infinity);
});

// ---------------------------------------------------------------------------
// Meshing (single-threaded entry point only).
// ---------------------------------------------------------------------------

check('sphere meshes with consistent counts and indices', () => {
    setRegion(-1.25, 1.25, -1.25, 1.25, -1.25, 1.25);
    const mesh = module._shim_tree_render_mesh_st(sphere, regionPtr, 16);
    assert.ok(mesh, 'meshing returned null');
    try {
        const vertCount = module._shim_mesh_vert_count(mesh);
        const triCount = module._shim_mesh_tri_count(mesh);
        assert.ok(vertCount > 100, `vert_count=${vertCount}`);
        assert.ok(triCount > 100, `tri_count=${triCount}`);

        const verts = f32(module._shim_mesh_verts(mesh), vertCount * 3);
        // Vertex 0 is libfive's reserved BRep marker, not a surface point.
        for (let i = 1; i < vertCount; i++) {
            const vx = verts[i * 3];
            const vy = verts[i * 3 + 1];
            const vz = verts[i * 3 + 2];
            const r = Math.hypot(vx, vy, vz);
            assert.ok(r > 0.5 && r < 1.5,
                `vertex ${i} at radius ${r} is not near the unit sphere`);
        }

        const tris = u32(module._shim_mesh_tris(mesh), triCount * 3);
        for (let i = 0; i < triCount * 3; i++) {
            assert.ok(tris[i] < vertCount,
                `triangle index ${tris[i]} >= vertex count ${vertCount}`);
        }
    } finally {
        module._libfive_mesh_delete(mesh);
    }
});

// ---------------------------------------------------------------------------
// Cleanup (idempotent frees are the API's contract; this test just frees once).
// ---------------------------------------------------------------------------

for (const ptr of trees) {
    module._libfive_tree_delete(ptr);
}
module._free(pointPtr);
module._free(regionPtr);
module._free(intervalPtr);
module._free(derivPtr);

if (failures > 0) {
    console.error(`${failures} smoke check(s) failed`);
    process.exit(1);
}
console.log('smoke test passed');
