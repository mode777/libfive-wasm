/*
 * libfive-wasm: loader option and result types.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { LibfiveModule, RawLibfive } from '../ffi/types.js';

/**
 * Options for `init()` (api-design.md, AD-007). Unknown behavior for
 * future options: they are additive; unrecognized keys are ignored.
 */
export interface InitOptions {
    /**
     * Provide the wasm bytes yourself (ArrayBuffer / TypedArray). Takes
     * precedence over `locateWasm` and default resolution.
     */
    wasmBinary?: ArrayBufferView | ArrayBuffer;
    /**
     * Custom resolution of the .wasm URL (default: the artifact beside the
     * package module, via the Emscripten factory's import.meta.url lookup).
     */
    locateWasm?: (filename: string) => string | URL;
    /**
     * Enable lifecycle diagnostics (leaked-object warnings). Default false.
     * The diagnostics themselves arrive with the object-lifecycle layer
     * (AD-005); enabling the flag changes nothing else.
     */
    debug?: boolean;
}

/** A libfive-wasm instance: an independent module with its own heap. */
export interface Libfive {
    /** Typed raw C namespace — advanced escape hatch (AD-011). */
    readonly raw: RawLibfive;
    /** Whether lifecycle diagnostics were requested for this instance. */
    readonly debug: boolean;
}

/** Argument object forwarded to the Emscripten ES6 factory. */
export interface LibfiveModuleArg {
    wasmBinary?: ArrayBufferView | ArrayBuffer;
    locateFile?: (path: string, prefix: string) => string;
}

/**
 * The Emscripten ES6 module factory (default export of the generated
 * `libfive.js` glue).
 */
export type ModuleFactory = (
    arg?: LibfiveModuleArg,
) => Promise<LibfiveModule>;
