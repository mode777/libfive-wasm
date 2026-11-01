/*
 * libfive-wasm: UTF-8 string marshalling.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { LibfiveModule, StrPtr, VoidPtr } from './types.js';

export function makeStringHelpers(module: LibfiveModule) {
    return {
        /** Allocates and writes a NUL-terminated UTF-8 copy of `text`. */
        allocUtf8(text: string): VoidPtr {
            const bytes = module.lengthBytesUTF8(text) + 1;
            const ptr = module._malloc(bytes);
            module.stringToUTF8(text, ptr, bytes);
            return ptr;
        },

        /** Reads a borrowed NUL-terminated UTF-8 string. */
        readString(ptr: VoidPtr): string {
            return module.UTF8ToString(ptr);
        },

        /**
         * Reads a kernel-owned string (e.g. from `_libfive_tree_print`) and
         * releases it with `_libfive_free_str` — the copy into JS happens
         * first, and callers never free kernel strings by hand.
         */
        readKernelString(ptr: StrPtr): string {
            try {
                return module.UTF8ToString(ptr);
            } finally {
                module._libfive_free_str(ptr);
            }
        },
    };
}
