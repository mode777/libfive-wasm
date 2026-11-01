/*
 * libfive-wasm tests: public type-surface consumer (type-only).
 *
 * Compiled by `npm run check` to prove the documented surface is
 * importable and usable from consuming TypeScript; not executed by vitest.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
    exportSTL,
    init,
    LibfiveError,
    Mesh,
    Shape,
} from '../src/index.js';
import type {
    InitOptions,
    Libfive,
    MeshOptions,
    RawLibfive,
    Region3,
    TFloat,
    Vec3Arg,
} from '../src/index.js';

// The documented InitOptions surface (api-design.md).
const options: InitOptions = {
    wasmBinary: new ArrayBuffer(8),
    locateWasm: (filename) => new URL(filename, 'file:///assets/'),
    debug: true,
};
void options;

// init() resolves to a Libfive whose raw namespace carries the frozen ABI.
async function consume(): Promise<Libfive> {
    const libfive = await init({ debug: true });
    const raw: RawLibfive = libfive.raw;
    const debug: boolean = libfive.debug;
    void debug;

    // Branded handles flow into the shim signatures.
    const x = raw._libfive_tree_x();
    const region = raw.allocRegion3();
    region.set(-1, 1, -1, 1, -1, 1);
    const mesh = raw._shim_tree_render_mesh_st(x, region.ptr, 16);
    const count: number = raw._shim_mesh_vert_count(mesh);
    raw._libfive_tree_delete(x);
    region.free();
    void count;

    return libfive;
}
void consume;

// The convenience surface (shape-api): factories, chainable methods,
// evaluation, meshing, STL export.
async function convenience(): Promise<void> {
    const libfive = await init();
    const s: Shape = libfive.x().add(1);
    const mixed: Vec3Arg = [1, s, libfive.constant(2)];
    const region: Region3 = { min: [-1, -1, -1], max: [1, 1, 1] };
    const opts: MeshOptions = { region, res: 16 };

    const blended: Shape = s
        .square()
        .sub(1)
        .union(libfive.y())
        .blend(libfive.z(), 0.3);
    const value: number = blended.evalF([0, 0, 0]);
    const bounds = blended.evalR(region);
    const lower: number = bounds.lower;
    void lower;
    const text: string = blended.toString();
    void text;
    void value;
    void mixed;

    const shapeMesh: Mesh = blended.mesh(opts);
    const positionalMesh: Mesh = blended.mesh(region.min, region.max, 16);
    const verts: Float32Array = shapeMesh.verts;
    const tris: Uint32Array = shapeMesh.tris;
    const copies: Float32Array = shapeMesh.copyVerts();
    const counts: number = shapeMesh.vertCount + shapeMesh.triCount;
    const stl: ArrayBuffer = exportSTL(shapeMesh);
    shapeMesh.free();
    positionalMesh.free();

    // fromTree adopts a raw handle through the instance-bound class.
    const adopted: Shape = libfive.Shape.fromTree(libfive.raw._libfive_tree_x());

    const scalar: TFloat = 3;
    void verts;
    void tris;
    void copies;
    void counts;
    void stl;
    void scalar;
    void adopted;

    blended.free();
}

void convenience;

// The package error type is catchable and stable.
function failures(err: unknown): string {
    if (err instanceof LibfiveError) {
        return `${err.name}: ${err.message}`;
    }
    return 'other';
}
void failures;
