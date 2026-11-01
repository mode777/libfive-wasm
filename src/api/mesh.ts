/*
 * libfive-wasm: the `Mesh` result type (AD-006).
 *
 * Vertices and triangles live in wasm memory; the view getters re-bind to
 * the current wasm buffer on every access so they survive heap growth.
 * Data is valid until `free()`; use `copyVerts()`/`copyTris()` for
 * JS-owned data (AD-006). A `Mesh` outlives the `Shape` that produced it.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { MeshPtr } from '../ffi/types.js';
import type { ApiContext } from './context.js';
import type { Token } from './lifecycle.js';

/**
 * An indexed 3D mesh produced by {@link Shape.mesh}: `vertCount` vertices
 * (`verts`, a `Float32Array` of `vertCount * 3` xyz triples) and
 * `triCount` triangles (`tris`, a `Uint32Array` of `triCount * 3` vertex
 * indices, each strictly below `vertCount`).
 */
export class Mesh {
    private readonly ctx: ApiContext;
    private readonly token: Token;
    private readonly vertsStored: number;
    private readonly trisStored: number;

    /** @internal — created by `Shape.mesh`. */
    constructor(ctx: ApiContext, ptr: MeshPtr) {
        this.ctx = ctx;
        this.vertsStored = ctx.raw._shim_mesh_vert_count(ptr);
        this.trisStored = ctx.raw._shim_mesh_tri_count(ptr);
        this.token = ctx.lifecycle.register(this, 'Mesh', ptr, (p) =>
            ctx.raw._libfive_mesh_delete(p as MeshPtr),
        );
    }

    /** Number of vertices (throws after `free()`). */
    get vertCount(): number {
        this.ctx.lifecycle.requireAlive(this.token, 'vertCount');
        return this.vertsStored;
    }

    /** Number of triangles (throws after `free()`). */
    get triCount(): number {
        this.ctx.lifecycle.requireAlive(this.token, 'triCount');
        return this.trisStored;
    }

    /**
     * Zero-copy view of the vertex xyz triples, re-bound to the current
     * wasm memory on every access (AD-006). Valid until `free()`.
     */
    get verts(): Float32Array {
        const ptr = this.ctx.lifecycle.requireAlive(this.token, 'verts');
        return this.ctx.raw.f32View(
            this.ctx.raw._shim_mesh_verts(ptr as MeshPtr),
            this.vertsStored * 3,
        );
    }

    /**
     * Zero-copy view of the triangle vertex indices, re-bound to the
     * current wasm memory on every access (AD-006). Valid until `free()`.
     */
    get tris(): Uint32Array {
        const ptr = this.ctx.lifecycle.requireAlive(this.token, 'tris');
        return this.ctx.raw.u32View(
            this.ctx.raw._shim_mesh_tris(ptr as MeshPtr),
            this.trisStored * 3,
        );
    }

    /** JS-owned copy of the vertices; survives `free()`. */
    copyVerts(): Float32Array {
        return this.verts.slice();
    }

    /** JS-owned copy of the triangle indices; survives `free()`. */
    copyTris(): Uint32Array {
        return this.tris.slice();
    }

    /** Releases the kernel mesh; idempotent. */
    free(): void {
        this.ctx.lifecycle.free(this.token);
    }
}
