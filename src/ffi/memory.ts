/*
 * libfive-wasm: heap-view utilities.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { LibfiveModule, VoidPtr } from './types.js';

/**
 * Views are always created against the *current* wasm buffer, so they
 * survive heap growth (AD-006): growth relocates the buffer and the glue
 * reassigns the exported views; the next call re-binds.
 */
export function makeViewHelpers(module: LibfiveModule) {
    return {
        f32View(ptr: VoidPtr, length: number): Float32Array {
            return new Float32Array(module.HEAPF32.buffer, ptr, length);
        },
        u32View(ptr: VoidPtr, length: number): Uint32Array {
            return new Uint32Array(module.HEAPU32.buffer, ptr, length);
        },
        u8View(ptr: VoidPtr, length: number): Uint8Array {
            return new Uint8Array(module.HEAPU8.buffer, ptr, length);
        },
    };
}
