/*
 * libfive-wasm: the curated raw namespace over the Emscripten module.
 *
 * Members are re-exposed under the module's verbatim keys (AD-010/AD-011).
 * The key list mirrors the core manifest in `wasm/exports.txt` plus the
 * allocator and exported runtime helpers; the parity test in
 * `tests/raw.test.ts` fails if the artifact surface and this list drift
 * apart. C stdlib functions (appended to the artifact at link time) are
 * deliberately NOT part of this object: their typed wrappers arrive
 * generated with stdlib-bindings (AD-017).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LibfiveError } from '../errors.js';
import { makeStructHelpers } from './structs.js';
import { makeStringHelpers } from './strings.js';
import { makeViewHelpers } from './memory.js';
import type { LibfiveModule, RawLibfive } from './types.js';

/**
 * Core export manifest symbols (keep in lockstep with
 * `wasm/exports.txt`; the parity test cross-checks). Exported for the
 * parity test.
 */
export const CORE_EXPORT_KEYS = [
    // Tree construction and inspection
    '_libfive_tree_x',
    '_libfive_tree_y',
    '_libfive_tree_z',
    '_libfive_tree_var',
    '_libfive_tree_is_var',
    '_libfive_tree_const',
    '_libfive_tree_nullary',
    '_libfive_tree_unary',
    '_libfive_tree_binary',
    '_libfive_tree_id',
    '_libfive_tree_delete',
    '_libfive_tree_remap',
    '_libfive_tree_optimized',
    '_libfive_tree_print',
    '_libfive_free_str',
    // Opcode lookup
    '_libfive_opcode_enum',
    '_libfive_opcode_args',
    // Kernel object deleters
    '_libfive_mesh_delete',
    '_libfive_evaluator_delete',
    '_libfive_vars_delete',
    // ABI shims
    '_shim_region3_set',
    '_shim_vec3_set',
    '_shim_tree_eval_f',
    '_shim_tree_eval_r',
    '_shim_tree_eval_d',
    '_shim_tree_get_const',
    '_shim_tree_render_mesh_st',
    '_shim_mesh_verts',
    '_shim_mesh_tris',
    '_shim_mesh_vert_count',
    '_shim_mesh_tri_count',
    '_shim_tree_evaluator',
    '_shim_evaluator_update_vars',
    // Allocator
    '_malloc',
    '_free',
] as const;

/** Exported runtime helpers. */
const RUNTIME_FUNCTION_KEYS = [
    'UTF8ToString',
    'stringToUTF8',
    'lengthBytesUTF8',
    'getValue',
    'setValue',
] as const;

/**
 * Views are exposed as getters: the glue reassigns them when the heap
 * grows (`updateMemoryViews`), and a snapshot copy would go stale. The
 * artifact exports no `memory` property (frozen surface, AD-022).
 */
const LIVE_KEYS = [
    'HEAP8',
    'HEAPU8',
    'HEAP32',
    'HEAPU32',
    'HEAPF32',
] as const;

/** Builds the curated `libfive.raw` object for a module instance. */
export function createRaw(module: LibfiveModule): RawLibfive {
    const source = module as unknown as Record<string, unknown>;
    const raw: Record<string, unknown> = {};

    for (const key of [...CORE_EXPORT_KEYS, ...RUNTIME_FUNCTION_KEYS]) {
        const value = source[key];
        if (value !== undefined) {
            raw[key] = value;
        }
    }
    for (const key of LIVE_KEYS) {
        Object.defineProperty(raw, key, {
            enumerable: true,
            get: () => source[key],
        });
    }

    const strings = makeStringHelpers(module);
    Object.assign(
        raw,
        strings,
        makeViewHelpers(module),
        makeStructHelpers(module),
        {
            /** Resolves an opcode name; throws on unknown names. */
            opcodeByName(name: string): number {
                const ptr = strings.allocUtf8(name);
                try {
                    const op = module._libfive_opcode_enum(ptr);
                    if (op < 0) {
                        throw new LibfiveError(`unknown opcode: ${name}`);
                    }
                    return op;
                } finally {
                    module._free(ptr);
                }
            },
        },
    );

    // The key list above is the manifest contract; the assembled object is
    // complete for a correctly built artifact (parity-tested in
    // tests/raw.test.ts).
    return raw as unknown as RawLibfive;
}
