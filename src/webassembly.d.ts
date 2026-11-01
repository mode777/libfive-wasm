/*
 * libfive-wasm: minimal WebAssembly global declarations.
 *
 * TypeScript only ships the WebAssembly global value inside lib.dom /
 * lib.webworker, and this package intentionally targets Node without DOM
 * libs. esbuild (via vitest) augments the global namespace with an empty
 * `Module` interface for the same reason; this declaration merges the
 * `Memory` global the package's typings reference (ESM target, no import).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

declare global {
    namespace WebAssembly {
        interface MemoryDescriptor {
            initial: number;
            maximum?: number;
            shared?: boolean;
        }

        class Memory {
            constructor(descriptor: MemoryDescriptor);
            readonly buffer: ArrayBuffer;
            grow(delta: number): number;
        }
    }
}

export {};
