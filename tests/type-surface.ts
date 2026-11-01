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

import { init, LibfiveError } from '../src/index.js';
import type { InitOptions, Libfive, RawLibfive } from '../src/index.js';

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

// The package error type is catchable and stable.
function failures(err: unknown): string {
    if (err instanceof LibfiveError) {
        return `${err.name}: ${err.message}`;
    }
    return 'other';
}
void failures;
