/*
 * libfive-wasm: asynchronous initialization (AD-007).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LibfiveError } from '../errors.js';
import { createInstance } from '../api/instance.js';
import type { LibfiveModule } from '../ffi/types.js';
import { loadFactory } from './glue.js';
import type {
    InitOptions,
    Libfive,
    LibfiveModuleArg,
    ModuleFactory,
} from './types.js';

export type {
    InitOptions,
    Libfive,
    LibfiveModuleArg,
    ModuleFactory,
} from './types.js';

function isArrayBufferOrView(value: unknown): value is ArrayBuffer | ArrayBufferView {
    return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

/** Validates user-provided options; throws `LibfiveError` on misuse. */
function validateOptions(options: InitOptions): void {
    if (
        options.wasmBinary !== undefined &&
        !isArrayBufferOrView(options.wasmBinary)
    ) {
        throw new LibfiveError(
            'init option "wasmBinary" must be an ArrayBuffer or ArrayBufferView',
        );
    }
    if (
        options.locateWasm !== undefined &&
        typeof options.locateWasm !== 'function'
    ) {
        throw new LibfiveError(
            'init option "locateWasm" must be a function mapping the artifact filename to a URL',
        );
    }
    if (options.debug !== undefined && typeof options.debug !== 'boolean') {
        throw new LibfiveError('init option "debug" must be a boolean');
    }
}

/**
 * Instantiates libfive from an explicit Emscripten factory.
 *
 * Internal seam (design.md D2): the test suite and the compiled packaging
 * entry use it to supply the factory directly; the documented entry point
 * is {@link init}.
 *
 * @internal
 */
export async function initFromFactory(
    factory: ModuleFactory,
    options: InitOptions = {},
): Promise<Libfive> {
    validateOptions(options);

    const arg: LibfiveModuleArg = {};
    if (options.wasmBinary !== undefined) {
        // Explicit bytes win over any URL resolution.
        arg.wasmBinary = options.wasmBinary;
    } else if (options.locateWasm !== undefined) {
        const locateWasm = options.locateWasm;
        arg.locateFile = (path: string) => String(locateWasm(path));
    }

    let module: LibfiveModule;
    try {
        module = await factory(arg);
    } catch (err) {
        throw new LibfiveError('failed to instantiate libfive.wasm', {
            cause: err,
        });
    }

    return createInstance(module, options.debug ?? false);
}

/**
 * Loads and instantiates the libfive wasm kernel.
 *
 * Without options the artifact is resolved beside the package module
 * (import.meta.url-based — works natively in Node ≥ 18, modern browsers,
 * and bundlers). Every call returns an independent instance with its own
 * wasm heap; create one and pass it around.
 *
 * The returned object exposes `raw`, the typed C namespace — an advanced
 * escape hatch beneath the convenience API; it is semver-relevant
 * (AD-011) — the shape factories (`x`, `y`, `z`, `constant`, `var`), the
 * instance-bound `Shape` class, and `debug`, whether lifecycle
 * diagnostics were requested.
 *
 * @example
 * ```ts
 * import { init } from 'libfive-wasm';
 * const libfive = await init();
 * ```
 */
export async function init(options: InitOptions = {}): Promise<Libfive> {
    validateOptions(options);
    const factory = await loadFactory();
    return initFromFactory(factory, options);
}
