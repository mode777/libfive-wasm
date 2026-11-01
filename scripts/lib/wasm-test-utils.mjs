/*
libfive-wasm test support: load the built artifact and talk to its raw exports.

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Parse `--glue <path>` / `--wasm <path>` (with `=` forms) and fall back to the
 * release artifact under dist/.
 */
export function parseArtifactArgs(argv) {
    const out = {
        glue: path.join(REPO_ROOT, 'dist', 'libfive.js'),
        wasm: path.join(REPO_ROOT, 'dist', 'libfive.wasm'),
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        for (const key of ['glue', 'wasm']) {
            if (arg === `--${key}`) {
                out[key] = argv[++i];
            } else if (arg.startsWith(`--${key}=`)) {
                out[key] = arg.slice(key.length + 3);
            }
        }
    }
    return {
        glue: path.resolve(out.glue),
        wasm: path.resolve(out.wasm),
    };
}

/** Instantiate the ES6 factory, supplying the artifact bytes directly. */
export async function loadArtifact({ glue, wasm }) {
    const mod = await import(pathToFileURL(glue).href);
    const factory = mod.default;
    if (typeof factory !== 'function') {
        throw new Error(`${glue} does not export an Emscripten factory`);
    }
    return factory({ wasmBinary: readFileSync(wasm) });
}

export function allocUtf8(module, text) {
    const bytes = new TextEncoder().encode(text);
    const ptr = module._malloc(bytes.length + 1);
    module.HEAPU8.set(bytes, ptr);
    module.HEAPU8[ptr + bytes.length] = 0;
    return ptr;
}

/**
 * Resolve an opcode name once. Callers own the returned numeric opcode.
 */
export function opcode(module, name) {
    const ptr = allocUtf8(module, name);
    try {
        const op = module._libfive_opcode_enum(ptr);
        if (op < 0) {
            throw new Error(`unknown opcode: ${name}`);
        }
        return op;
    } finally {
        module._free(ptr);
    }
}

export function heaps(module) {
    return {
        f32: (ptr, len) => new Float32Array(module.HEAPF32.buffer, ptr, len),
        u32: (ptr, len) => new Uint32Array(module.HEAPU32.buffer, ptr, len),
        i32: (ptr, len) => new Int32Array(module.HEAP32.buffer, ptr, len),
    };
}
