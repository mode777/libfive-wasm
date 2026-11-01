/*
 * libfive-wasm: struct allocation routed through the ABI shims.
 *
 * JavaScript never encodes C struct offsets: fills go through
 * `shim_region3_set`/`shim_vec3_set`, reads go through typed views on the
 * out-pointer. Sizes come from `wasm/shim.h` (float fields, tight packs).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type {
    IntervalRef,
    LibfiveModule,
    Region3Ref,
    Vec3Ref,
    VoidPtr,
} from './types.js';

export function makeStructHelpers(module: LibfiveModule) {
    return {
        /** `libfive_region3`: six floats. */
        allocRegion3(): Region3Ref {
            const ptr = module._malloc(24);
            return {
                ptr,
                set(xLower, xUpper, yLower, yUpper, zLower, zUpper) {
                    module._shim_region3_set(
                        ptr,
                        xLower,
                        xUpper,
                        yLower,
                        yUpper,
                        zLower,
                        zUpper,
                    );
                },
                free() {
                    module._free(ptr);
                },
            };
        },

        /** `libfive_vec3`: three floats, readable back as a triple. */
        allocVec3(): Vec3Ref {
            const ptr = module._malloc(12);
            return {
                ptr,
                set(x, y, z) {
                    module._shim_vec3_set(ptr, x, y, z);
                },
                read(): [number, number, number] {
                    const v = new Float32Array(module.HEAPF32.buffer, ptr, 3);
                    return [v[0]!, v[1]!, v[2]!];
                },
                free() {
                    module._free(ptr);
                },
            };
        },

        /** 8-byte `libfive_interval` out-parameter (`lower`, `upper`). */
        allocIntervalOut(): IntervalRef {
            const ptr = module._malloc(8);
            return {
                ptr,
                read() {
                    const v = new Float32Array(module.HEAPF32.buffer, ptr, 2);
                    return { lower: v[0]!, upper: v[1]! };
                },
                free() {
                    module._free(ptr);
                },
            };
        },

        /** 12-byte `libfive_vec3` out-parameter. */
        allocVec3Out(): Vec3Ref {
            const ptr: VoidPtr = module._malloc(12);
            return {
                ptr,
                set(x, y, z) {
                    module._shim_vec3_set(ptr, x, y, z);
                },
                read(): [number, number, number] {
                    const v = new Float32Array(module.HEAPF32.buffer, ptr, 3);
                    return [v[0]!, v[1]!, v[2]!];
                },
                free() {
                    module._free(ptr);
                },
            };
        },
    };
}
