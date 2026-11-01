/*
 * libfive-wasm tests: end-to-end kernel flows through the raw namespace
 * against the real artifact (mirrors scripts/test-smoke.mjs via the
 * package loader).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { initFromFactory } from '../src/loader/index.js';
import { loadRealFactory } from './support/artifact.js';
import type { Libfive } from '../src/index.js';
import type { TreePtr } from '../src/ffi/types.js';

let libfive: Libfive;

beforeAll(async () => {
    const factory = await loadRealFactory();
    libfive = await initFromFactory(factory, { debug: false });
});

/** sqrt(x² + y² + z²) − 1, built from opcodes. */
function buildSphere(): TreePtr {
    const { raw } = libfive;
    const trees: TreePtr[] = [];
    const track = (ptr: TreePtr): TreePtr => {
        trees.push(ptr);
        return ptr;
    };
    try {
        const opAdd = raw.opcodeByName('add');
        const opSub = raw.opcodeByName('sub');
        const opMul = raw.opcodeByName('mul');
        const opSqrt = raw.opcodeByName('sqrt');

        const x = track(raw._libfive_tree_x());
        const y = track(raw._libfive_tree_y());
        const z = track(raw._libfive_tree_z());
        const one = track(raw._libfive_tree_const(1));

        const square = (t: TreePtr) =>
            track(raw._libfive_tree_binary(opMul, t, t));
        const x2 = square(x);
        const y2 = square(y);
        const z2 = square(z);
        const sum = track(
            raw._libfive_tree_binary(
                opAdd,
                track(raw._libfive_tree_binary(opAdd, x2, y2)),
                z2,
            ),
        );
        const radius = track(raw._libfive_tree_unary(opSqrt, sum));
        return raw._libfive_tree_binary(opSub, radius, one);
    } finally {
        for (const tree of trees) {
            raw._libfive_tree_delete(tree);
        }
    }
}

describe('kernel flows through raw', () => {
    it('resolves opcodes by name and rejects unknown names', () => {
        const { raw } = libfive;
        expect(raw.opcodeByName('add')).toBeGreaterThanOrEqual(0);
        expect(() => raw.opcodeByName('definitely-not-an-opcode')).toThrow(
            /unknown opcode/,
        );
    });

    it('hand-built sphere evaluates negative inside, positive outside', () => {
        const { raw } = libfive;
        const sphere = buildSphere();
        try {
            const region = raw.allocRegion3();
            const interval = raw.allocIntervalOut();
            try {
                region.set(-0.5, 0.5, -0.5, 0.5, -0.5, 0.5);
                raw._shim_tree_eval_r(sphere, region.ptr, interval.ptr);
                const inside = interval.read();
                expect(inside.lower).toBeLessThan(inside.upper);
                expect(inside.upper).toBeLessThan(0);

                region.set(2, 3, 2, 3, 2, 3);
                raw._shim_tree_eval_r(sphere, region.ptr, interval.ptr);
                const outside = interval.read();
                expect(outside.lower).toBeGreaterThan(0);
            } finally {
                region.free();
                interval.free();
            }
        } finally {
            raw._libfive_tree_delete(sphere);
        }
    });

    it('tree_print round-trips through a kernel string', () => {
        const { raw } = libfive;
        const sphere = buildSphere();
        try {
            const strPtr = raw._libfive_tree_print(sphere);
            expect(strPtr).not.toBe(0);
            const text = raw.readKernelString(strPtr);
            expect(text).toContain('sqrt');
        } finally {
            raw._libfive_tree_delete(sphere);
        }
    });

    it('meshes a sphere with consistent counts, indices and radii', () => {
        const { raw } = libfive;
        const sphere = buildSphere();
        try {
            const region = raw.allocRegion3();
            try {
                region.set(-1.25, 1.25, -1.25, 1.25, -1.25, 1.25);
                const mesh = raw._shim_tree_render_mesh_st(
                    sphere,
                    region.ptr,
                    16,
                );
                expect(mesh).not.toBe(0);
                try {
                    const vertCount = raw._shim_mesh_vert_count(mesh);
                    const triCount = raw._shim_mesh_tri_count(mesh);
                    expect(vertCount).toBeGreaterThan(100);
                    expect(triCount).toBeGreaterThan(100);

                    const verts = raw.f32View(
                        raw._shim_mesh_verts(mesh),
                        vertCount * 3,
                    );
                    // Vertex 0 is libfive's reserved BRep marker.
                    for (let i = 1; i < vertCount; i++) {
                        const vx = verts[i * 3] as number;
                        const vy = verts[i * 3 + 1] as number;
                        const vz = verts[i * 3 + 2] as number;
                        const r = Math.hypot(vx, vy, vz);
                        expect(r).toBeGreaterThan(0.5);
                        expect(r).toBeLessThan(1.5);
                    }

                    const tris = raw.u32View(
                        raw._shim_mesh_tris(mesh),
                        triCount * 3,
                    );
                    for (let i = 0; i < triCount * 3; i++) {
                        expect(tris[i] as number).toBeLessThan(vertCount);
                    }
                } finally {
                    raw._libfive_mesh_delete(mesh);
                }
            } finally {
                region.free();
            }
        } finally {
            raw._libfive_tree_delete(sphere);
        }
    });

    it('is_var reports free variables (int32-as-bool)', () => {
        const { raw } = libfive;
        const v = raw._libfive_tree_var();
        const c = raw._libfive_tree_const(3);
        try {
            expect(raw._libfive_tree_is_var(v)).toBe(1);
            expect(raw._libfive_tree_is_var(c)).toBe(0);
        } finally {
            raw._libfive_tree_delete(v);
            raw._libfive_tree_delete(c);
        }
    });
});
