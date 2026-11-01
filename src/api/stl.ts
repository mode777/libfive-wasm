/*
 * libfive-wasm: binary STL export built in TypeScript from the mesh views
 * (AD-018) — the kernel's file-based savers are unusable with
 * `FILESYSTEM=0` (AD-022 / wasm/README.md).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { Mesh } from './mesh.js';

/** STL record size: 12 bytes normal + 3 × 12 bytes vertices + 2 bytes. */
const RECORD_SIZE = 50;
/** STL header (unused, kept zeroed) + uint32 triangle count. */
const PREAMBLE_SIZE = 84;

/**
 * Exports a binary STL built from the mesh views into a single JS-owned
 * `ArrayBuffer`: an 80-byte header, the triangle count as a little-endian
 * `uint32`, and one 50-byte record per triangle (computed face normal,
 * three `float32` vertices, zero attribute bytes). The mesh is left
 * unchanged; exporting after `mesh.free()` throws.
 */
export function exportSTL(mesh: Mesh): ArrayBuffer {
    // Reads through the mesh accessors: view and count access throw
    // naming the freed mesh after free().
    const tris = mesh.tris;
    const verts = mesh.verts;
    const triCount = mesh.triCount;

    const buffer = new ArrayBuffer(PREAMBLE_SIZE + RECORD_SIZE * triCount);
    const view = new DataView(buffer);
    // The 80-byte header stays zeroed.
    view.setUint32(80, triCount, true);

    let offset = PREAMBLE_SIZE;
    for (let t = 0; t < triCount; t++) {
        const base = t * 3;
        const ia = tris[base]! * 3;
        const ib = tris[base + 1]! * 3;
        const ic = tris[base + 2]! * 3;

        const ax = verts[ia]!;
        const ay = verts[ia + 1]!;
        const az = verts[ia + 2]!;
        const bx = verts[ib]!;
        const by = verts[ib + 1]!;
        const bz = verts[ib + 2]!;
        const cx = verts[ic]!;
        const cy = verts[ic + 1]!;
        const cz = verts[ic + 2]!;

        // Face normal from the cross product of the in-plane edges.
        const ux = bx - ax;
        const uy = by - ay;
        const uz = bz - az;
        const vx = cx - ax;
        const vy = cy - ay;
        const vz = cz - az;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz);
        if (len > 0) {
            nx /= len;
            ny /= len;
            nz /= len;
        } else {
            nx = 0;
            ny = 0;
            nz = 0;
        }

        view.setFloat32(offset, nx, true);
        view.setFloat32(offset + 4, ny, true);
        view.setFloat32(offset + 8, nz, true);
        view.setFloat32(offset + 12, ax, true);
        view.setFloat32(offset + 16, ay, true);
        view.setFloat32(offset + 20, az, true);
        view.setFloat32(offset + 24, bx, true);
        view.setFloat32(offset + 28, by, true);
        view.setFloat32(offset + 32, bz, true);
        view.setFloat32(offset + 36, cx, true);
        view.setFloat32(offset + 40, cy, true);
        view.setFloat32(offset + 44, cz, true);
        view.setUint16(offset + 48, 0, true);
        offset += RECORD_SIZE;
    }
    return buffer;
}
