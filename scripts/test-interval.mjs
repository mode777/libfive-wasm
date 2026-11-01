/*
libfive-wasm interval acceptance test (AD-015, AD-023).

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import assert from 'node:assert/strict';
import {
    heaps,
    loadArtifact,
    opcode,
    parseArtifactArgs,
} from './lib/wasm-test-utils.mjs';

const args = parseArtifactArgs(process.argv.slice(2));
const module = await loadArtifact(args);
const { f32 } = heaps(module);

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

const trees = [];
function track(ptr) {
    assert.ok(ptr, 'tree construction returned null');
    trees.push(ptr);
    return ptr;
}

const op = {
    add: opcode(module, 'add'),
    div: opcode(module, 'div'),
    exp: opcode(module, 'exp'),
    log: opcode(module, 'log'),
    mul: opcode(module, 'mul'),
    sin: opcode(module, 'sin'),
    sqrt: opcode(module, 'sqrt'),
};

const x = track(module._libfive_tree_x());
const y = track(module._libfive_tree_y());
const one = track(module._libfive_tree_const(1));
const two = track(module._libfive_tree_const(2));

const regionPtr = module._malloc(24);
const intervalPtr = module._malloc(8);

function evalRegion(tree, [x0, x1, y0, y1, z0, z1]) {
    module._shim_region3_set(regionPtr, x0, x1, y0, y1, z0, z1);
    module._shim_tree_eval_r(tree, regionPtr, intervalPtr);
    return f32(intervalPtr, 2);
}

function samples(lo, hi, n = 257) {
    const out = [];
    for (let i = 0; i < n; i++) {
        out.push(Math.fround(lo + (hi - lo) * (i / (n - 1))));
    }
    return out;
}

function assertContains(bounds, values, label) {
    const [lo, hi] = bounds;
    assert.ok(Number.isFinite(lo) && Number.isFinite(hi),
        `${label}: non-finite interval [${lo}, ${hi}]`);
    for (const value of values) {
        assert.ok(lo <= value && value <= hi,
            `${label}: ${value} outside [${lo}, ${hi}]`);
    }
}

// ---------------------------------------------------------------------------
// exp over [0, 1]: contains the true range and stays tight.
// ---------------------------------------------------------------------------

const expTree = track(module._libfive_tree_unary(op.exp, x));

check('exp bounds contain the true range', () => {
    const bounds = evalRegion(expTree, [0, 1, 0, 1, 0, 1]);
    assert.ok(bounds[0] <= 1, `lower bound ${bounds[0]} > 1`);
    assert.ok(bounds[1] >= Math.E - 1e-6, `upper bound ${bounds[1]} < e`);
    assertContains(bounds, samples(0, 1).map((v) => Math.exp(v)), 'exp');
});

check('exp bounds stay tight', () => {
    const [lo, hi] = evalRegion(expTree, [0, 1, 0, 1, 0, 1]);
    const width = hi - lo;
    assert.ok(width > 0, `zero-width interval [${lo}, ${hi}]`);
    assert.ok(width < 1.75, `exp width ${width} is not tight`);
});

// ---------------------------------------------------------------------------
// sin over [0, pi]: contains an interior maximum.
// ---------------------------------------------------------------------------

const sinTree = track(module._libfive_tree_unary(op.sin, x));

check('sin bounds contain the true range', () => {
    const bounds = evalRegion(sinTree, [0, Math.PI, 0, 1, 0, 1]);
    assert.ok(bounds[0] <= 0, `lower bound ${bounds[0]} > 0`);
    assert.ok(bounds[1] >= 1 - 1e-6, `upper bound ${bounds[1]} < 1`);
    assertContains(bounds,
        samples(0, Math.PI).map((v) => Math.sin(v)), 'sin');
});

check('sin bounds stay tight', () => {
    const [lo, hi] = evalRegion(sinTree, [0, Math.PI, 0, 1, 0, 1]);
    const width = hi - lo;
    assert.ok(width > 0, `zero-width interval [${lo}, ${hi}]`);
    assert.ok(width < 1.01, `sin width ${width} is not tight`);
});

// ---------------------------------------------------------------------------
// Division over a well-conditioned range.
// ---------------------------------------------------------------------------

const recipTree = track(module._libfive_tree_binary(op.div, one, x));

check('1/x over [1, 2] is conservative and tight', () => {
    const bounds = evalRegion(recipTree, [1, 2, 0, 1, 0, 1]);
    assert.ok(bounds[0] <= 0.5, `lower bound ${bounds[0]} > 0.5`);
    assert.ok(bounds[1] >= 1 - 1e-6, `upper bound ${bounds[1]} < 1`);
    const [lo, hi] = bounds;
    const width = hi - lo;
    assert.ok(width < 0.51, `1/x width ${width} is not tight`);
    assertContains(bounds, samples(1, 2).map((v) => 1 / v), '1/x');
});

// ---------------------------------------------------------------------------
// Division across zero: must not collapse to a narrow finite interval.
// ---------------------------------------------------------------------------

check('1/x across zero is not silently narrowed', () => {
    const [lo, hi] = evalRegion(recipTree, [-1, 1, 0, 1, 0, 1]);
    const unbounded = !Number.isFinite(lo) || !Number.isFinite(hi);
    assert.ok(unbounded || (lo < -1 && hi > 1),
        `narrow interval across zero: [${lo}, ${hi}]`);
    if (Number.isFinite(lo) && Number.isFinite(hi)) {
        assert.ok(hi - lo > 2, `narrow interval across zero: [${lo}, ${hi}]`);
    }
});

// ---------------------------------------------------------------------------
// Domain-limited functions crossing their domain edge.
// ---------------------------------------------------------------------------

const logTree = track(module._libfive_tree_unary(op.log, x));

check('log across its domain edge stays conservative', () => {
    const [lo, hi] = evalRegion(logTree, [-1, 1, 0, 1, 0, 1]);
    assert.equal(lo, -Infinity,
        `log across zero returned finite lower bound ${lo}`);
    const values = samples(0.01, 1).map((v) => Math.log(v));
    for (const value of values) {
        assert.ok(value >= lo && value <= hi,
            `log sample ${value} outside [${lo}, ${hi}]`);
    }
});

const sqrtTree = track(module._libfive_tree_unary(op.sqrt, x));

check('sqrt across its domain edge contains the defined range', () => {
    const bounds = evalRegion(sqrtTree, [-1, 1, 0, 1, 0, 1]);
    assertContains(bounds, samples(0, 1).map((v) => Math.sqrt(v)), 'sqrt');
});

// ---------------------------------------------------------------------------
// Mixed tree: exp(sin(x)) + 1/(y + 2), over a wide region.
// ---------------------------------------------------------------------------

const mixedTree = track(module._libfive_tree_binary(op.add,
    track(module._libfive_tree_unary(op.exp, sinTree)),
    track(module._libfive_tree_binary(op.div, one,
        track(module._libfive_tree_binary(op.add, y, two))))));

check('mixed tree stays conservative over a wide region', () => {
    const bounds = evalRegion(mixedTree, [-1, 1, -1, 1, 0, 1]);
    assert.ok(Number.isFinite(bounds[0]) && Number.isFinite(bounds[1]),
        `non-finite mixed bounds: [${bounds[0]}, ${bounds[1]}]`);
    assert.ok(bounds[0] <= bounds[1], 'inverted mixed bounds');

    const xs = samples(-1, 1, 33);
    const ys = samples(-1, 1, 33);
    for (const xv of xs) {
        for (const yv of ys) {
            const value = Math.exp(Math.sin(xv)) + 1 / (yv + 2);
            assert.ok(bounds[0] <= value && value <= bounds[1],
                `mixed sample ${value} outside [${bounds[0]}, ${bounds[1]}]`);
        }
    }
});

// ---------------------------------------------------------------------------

for (const ptr of trees) {
    module._libfive_tree_delete(ptr);
}
module._free(regionPtr);
module._free(intervalPtr);

if (failures > 0) {
    console.error(`${failures} interval check(s) failed`);
    process.exit(1);
}
console.log('interval test passed');
