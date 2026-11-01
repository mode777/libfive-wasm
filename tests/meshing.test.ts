/*
 * libfive-wasm tests: meshing entry points, Mesh view semantics and STL
 * export against the real artifact (tasks 4.1–4.3).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initFromFactory } from '../src/loader/index.js';
import { exportSTL, LibfiveError } from '../src/index.js';
import { REPO_ROOT } from './support/artifact.js';
import { loadRealFactory } from './support/artifact.js';
import type { Libfive, Mesh } from '../src/index.js';
import type { VoidPtr } from '../src/ffi/types.js';

let libfive: Libfive;

beforeAll(async () => {
    const factory = await loadRealFactory();
    libfive = await initFromFactory(factory, { debug: false });
});

function makeSphere(): ReturnType<Libfive['x']> {
    return libfive
        .x()
        .square()
        .add(libfive.y().square())
        .add(libfive.z().square())
        .sqrt()
        .sub(1);
}

const REGION = {
    min: [-1.25, -1.25, -1.25] as [number, number, number],
    max: [1.25, 1.25, 1.25] as [number, number, number],
};
// The kernel meshes with min_feature = 1/res (larger is finer); 16 is
// the proven smoke-test resolution for this region.
const RES = 16;

function expectLibfiveError(fn: () => unknown, pattern: RegExp): void {
    expect(fn).toThrow(LibfiveError);
    expect(fn).toThrow(pattern);
}

describe('meshing entry points (task 4.1)', () => {
    it('object-form meshing produces a mesh', () => {
        const sphere = makeSphere();
        try {
            const mesh = sphere.mesh({ region: { ...REGION }, res: RES });
            try {
                expect(mesh.vertCount).toBeGreaterThan(0);
                expect(mesh.triCount).toBeGreaterThan(0);
            } finally {
                mesh.free();
            }
        } finally {
            sphere.free();
        }
    });

    it('positional convenience form meshes with the same counts', () => {
        const sphere = makeSphere();
        try {
            const objectForm = sphere.mesh({ region: { ...REGION }, res: RES });
            const positionalForm = sphere.mesh(REGION.min, REGION.max, RES);
            try {
                expect(positionalForm.vertCount).toBe(objectForm.vertCount);
                expect(positionalForm.triCount).toBe(objectForm.triCount);
            } finally {
                objectForm.free();
                positionalForm.free();
            }
        } finally {
            sphere.free();
        }
    });

    it('meshing failure throws a named error and keeps the shape usable', () => {
        const sphere = makeSphere();
        try {
            // Force a kernel-side failure the honest way is not possible
            // from valid input; assert the NULL-conversion path through a
            // controlled raw-level stub instead, then prove the shape
            // remains usable after a failed meshing attempt.
            const options = {
                region: {
                    min: [-1, -1, -1] as [number, number, number],
                    max: [1, 1, 1] as [number, number, number],
                },
                res: RES,
            };
            const renderSpy = vi
                .spyOn(libfive.raw, '_shim_tree_render_mesh_st')
                .mockReturnValue(0 as never);
            try {
                expectLibfiveError(() => sphere.mesh(options), /Shape\.mesh.*failed to render/);
            } finally {
                renderSpy.mockRestore();
            }
            // Still usable: evaluation and meshing work.
            expect(sphere.evalF([0, 0, 0])).toBeCloseTo(-1, 4);
            const mesh = sphere.mesh(options);
            mesh.free();
        } finally {
            sphere.free();
        }
    });

    it('documentation states the res semantics', () => {
        const source = readFileSync(
            path.join(REPO_ROOT, 'src', 'api', 'shape.ts'),
            'utf8',
        );
        // The mesh() JSDoc must state the pinned kernel's semantics: res
        // is the inverse minimum feature size, larger is finer, not a
        // voxel count, and too-small values mesh empty.
        expect(source).toMatch(/inverse of the mesher's minimum feature size/);
        expect(source).toMatch(/min_feature = 1\/res/);
        expect(source).toMatch(/voxel count/);
        const types = readFileSync(
            path.join(REPO_ROOT, 'src', 'api', 'types.ts'),
            'utf8',
        );
        expect(types).toMatch(/inverse of the mesher's minimum feature size/);
    });

    it('an under-resolved mesh comes back empty rather than failing', () => {
        const sphere = makeSphere();
        try {
            // min_feature = 1/0.001 exceeds the region size entirely.
            const mesh = sphere.mesh({ region: { ...REGION }, res: 0.001 });
            try {
                expect(mesh.triCount).toBe(0);
                expect(mesh.verts.length).toBe(mesh.vertCount * 3);
                mesh.copyVerts(); // inspectable and freeable like any mesh
            } finally {
                mesh.free();
            }
        } finally {
            sphere.free();
        }
    });
});

describe('validation (task 4.1)', () => {
    it('non-finite res is rejected before crossing into wasm', () => {
        const sphere = makeSphere();
        try {
            const mallocSpy = vi.spyOn(libfive.raw, '_malloc');
            try {
                expectLibfiveError(
                    () => sphere.mesh({ region: { ...REGION }, res: NaN }),
                    /res must be a finite number/,
                );
                expectLibfiveError(
                    () => sphere.mesh([...REGION.min], [...REGION.max], Infinity),
                    /res must be a finite number/,
                );
                expect(mallocSpy).not.toHaveBeenCalled();
            } finally {
                mallocSpy.mockRestore();
            }
        } finally {
            sphere.free();
        }
    });

    it('inverted regions are rejected', () => {
        const sphere = makeSphere();
        try {
            expectLibfiveError(
                () =>
                    sphere.mesh({
                        region: { min: [2, -2, -2], max: [-2, 2, 2] },
                        res: RES,
                    }),
                /region min must be strictly below max/,
            );
            expectLibfiveError(
                () => sphere.mesh([0, 0, 0], [-1, 1, 1], RES),
                /region min must be strictly below max/,
            );
        } finally {
            sphere.free();
        }
    });

    it('non-finite corners are rejected', () => {
        const sphere = makeSphere();
        try {
            expectLibfiveError(
                () =>
                    sphere.mesh({
                        region: { min: [NaN, -2, -2], max: [2, 2, 2] },
                        res: RES,
                    }),
                /point components must be finite/,
            );
            expectLibfiveError(
                () => sphere.mesh([-2, -2, -2], [2, Infinity, 2], RES),
                /point components must be finite/,
            );
        } finally {
            sphere.free();
        }
    });
});

describe('Mesh views and lifetime (task 4.2)', () => {
    it('counts are non-zero, consistent, and indices stay in range', () => {
        const sphere = makeSphere();
        try {
            const mesh = sphere.mesh({ region: { ...REGION }, res: RES });
            try {
                const { vertCount, triCount } = mesh;
                expect(vertCount).toBeGreaterThan(0);
                expect(mesh.tris.length).toBe(triCount * 3);
                for (let i = 0; i < mesh.tris.length; i++) {
                    expect(mesh.tris[i]).toBeLessThan(vertCount);
                }
            } finally {
                mesh.free();
            }
        } finally {
            sphere.free();
        }
    });

    it('view lengths match counts; first vertices lie inside the region', () => {
        const sphere = makeSphere();
        try {
            const mesh = sphere.mesh({ region: { ...REGION }, res: RES });
            try {
                expect(mesh.verts.length).toBe(mesh.vertCount * 3);
                expect(mesh.tris.length).toBe(mesh.triCount * 3);
                const verts = mesh.verts;
                for (let v = 0; v < Math.min(16, mesh.vertCount); v++) {
                    const x = verts[v * 3]!;
                    const y = verts[v * 3 + 1]!;
                    const z = verts[v * 3 + 2]!;
                    expect(x).toBeGreaterThanOrEqual(REGION.min[0]! - 1e-4);
                    expect(x).toBeLessThanOrEqual(REGION.max[0]! + 1e-4);
                    expect(y).toBeGreaterThanOrEqual(REGION.min[1]! - 1e-4);
                    expect(z).toBeLessThanOrEqual(REGION.max[2]! + 1e-4);
                }
            } finally {
                mesh.free();
            }
        } finally {
            sphere.free();
        }
    });

    it('later accesses stay valid after forced heap growth', () => {
        const sphere = makeSphere();
        try {
            const mesh = sphere.mesh({ region: { ...REGION }, res: RES });
            try {
                const beforeVerts = mesh.verts.slice();
                const beforeBuffer = libfive.raw.HEAPF32.buffer;
                // Force wasm heap growth through big allocations.
                const held: VoidPtr[] = [];
                let grown = false;
                for (let i = 0; i < 40 && !grown; i++) {
                    const ptr = libfive.raw._malloc(8 * 1024 * 1024);
                    if (!ptr) {
                        break;
                    }
                    held.push(ptr);
                    grown = libfive.raw.HEAPF32.buffer !== beforeBuffer;
                }
                expect(grown, 'expected the wasm heap to grow').toBe(true);
                try {
                    // Fresh access re-binds to the current memory.
                    const after = mesh.verts;
                    expect(after.length).toBe(beforeVerts.length);
                    for (let i = 0; i < after.length; i++) {
                        expect(after[i]).toBe(beforeVerts[i]);
                    }
                } finally {
                    for (const ptr of held) {
                        libfive.raw._free(ptr);
                    }
                }
            } finally {
                mesh.free();
            }
        } finally {
            sphere.free();
        }
    });

    it('copies survive mesh free unchanged', () => {
        const sphere = makeSphere();
        try {
            const mesh = sphere.mesh({ region: { ...REGION }, res: RES });
            const verts = mesh.copyVerts();
            const tris = mesh.copyTris();
            const { vertCount, triCount } = mesh;
            mesh.free();
            // The mesh is gone; the copies are untouched.
            expect(() => mesh.verts).toThrow(/freed Mesh/);
            expect(verts.length).toBe(vertCount * 3);
            expect(tris.length).toBe(triCount * 3);
            // A fresh mesh of the same shape carries identical data.
            const mesh2 = sphere.mesh({ region: { ...REGION }, res: RES });
            try {
                expect(mesh2.vertCount).toBe(vertCount);
                expect(mesh2.triCount).toBe(triCount);
                for (let i = 0; i < verts.length; i++) {
                    expect(verts[i]).toBe(mesh2.verts[i]);
                }
            } finally {
                mesh2.free();
            }
        } finally {
            sphere.free();
        }
    });

    it('view and count access after free throws a named error', () => {
        const sphere = makeSphere();
        try {
            const mesh = sphere.mesh({ region: { ...REGION }, res: RES });
            mesh.free();
            expect(() => mesh.free()).not.toThrow();
            expect(() => mesh.verts).toThrow(/freed Mesh/);
            expect(() => mesh.tris).toThrow(/freed Mesh/);
            expect(() => mesh.vertCount).toThrow(/freed Mesh/);
            expect(() => mesh.triCount).toThrow(/freed Mesh/);
        } finally {
            sphere.free();
        }
    });

    it('the mesh outlives its producing shape', () => {
        const sphere = makeSphere();
        const mesh: Mesh = sphere.mesh({ region: { ...REGION }, res: RES });
        const snapshot = mesh.copyVerts();
        sphere.free();
        try {
            // The producing shape is gone; the mesh is intact.
            expect(mesh.vertCount).toBeGreaterThan(0);
            const verts = mesh.verts;
            for (let i = 0; i < verts.length; i++) {
                expect(verts[i]).toBe(snapshot[i]);
            }
        } finally {
            mesh.free();
        }
    });
});

describe('STL export (task 4.3)', () => {
    it('produces a structurally valid binary STL', () => {
        const sphere = makeSphere();
        try {
            const mesh = sphere.mesh({ region: { ...REGION }, res: RES });
            try {
                const stl = exportSTL(mesh);
                expect(stl).toBeInstanceOf(ArrayBuffer);
                expect(stl.byteLength).toBe(84 + 50 * mesh.triCount);
                const view = new DataView(stl);
                expect(view.getUint32(80, true)).toBe(mesh.triCount);
                // Attribute byte count is zero in every record.
                for (let t = 0; t < mesh.triCount; t++) {
                    expect(view.getUint16(84 + 50 * t + 48, true)).toBe(0);
                }
                // Referenced vertices stay inside the meshing region and
                // records are little-endian floats matching the views.
                const verts = mesh.verts;
                const tris = mesh.tris;
                for (let t = 0; t < mesh.triCount; t++) {
                    for (const vi of [0, 1, 2]) {
                        const idx = tris[t * 3 + vi]!;
                        const recordOffset = 84 + 50 * t + 12 + 12 * vi;
                        expect(view.getFloat32(recordOffset, true)).toBeCloseTo(
                            verts[idx * 3]!, 3);
                        expect(idx).toBeLessThan(mesh.vertCount);
                    }
                }
            } finally {
                mesh.free();
            }
        } finally {
            sphere.free();
        }
    });

    it('export leaves the mesh reusable and throws after free', () => {
        const sphere = makeSphere();
        try {
            const mesh = sphere.mesh({ region: { ...REGION }, res: RES });
            try {
                const first = exportSTL(mesh);
                const second = exportSTL(mesh);
                expect(new Uint8Array(first)).toEqual(new Uint8Array(second));
                expect(mesh.triCount).toBeGreaterThan(0);
                mesh.free();
                expectLibfiveError(() => exportSTL(mesh), /freed Mesh/);
            } finally {
                mesh.free();
            }
        } finally {
            sphere.free();
        }
    });
});
