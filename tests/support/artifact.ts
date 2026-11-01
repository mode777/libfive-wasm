/*
 * libfive-wasm tests: artifact loading support.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { LibfiveModule } from '../../src/ffi/types.js';
import type { ModuleFactory } from '../../src/loader/types.js';

export const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
);

export const GLUE_PATH = path.join(REPO_ROOT, 'dist', 'libfive.js');
export const WASM_PATH = path.join(REPO_ROOT, 'dist', 'libfive.wasm');

/**
 * Imports the real Emscripten glue and returns its factory, mirroring
 * scripts/lib/wasm-test-utils.mjs (import glue, pass wasmBinary).
 */
export async function loadRealFactory(): Promise<ModuleFactory> {
    try {
        readFileSync(WASM_PATH);
    } catch {
        throw new Error(
            'dist/libfive.wasm not found — run scripts/build-wasm.sh first ' +
                '(CI builds it; locally it runs on the verification server)',
        );
    }
    const mod = (await import(pathToFileURL(GLUE_PATH).href)) as {
        default?: unknown;
    };
    if (typeof mod.default !== 'function') {
        throw new Error(`${GLUE_PATH} does not export an Emscripten factory`);
    }
    return mod.default as ModuleFactory;
}

/** Instantiates the real artifact from its bytes. */
export async function loadRealModule(): Promise<LibfiveModule> {
    const factory = await loadRealFactory();
    return factory({ wasmBinary: readFileSync(WASM_PATH) });
}
