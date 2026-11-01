/*
 * libfive-wasm: factory acquisition seam.
 *
 * The generated glue (default export `createLibfiveModule`) is the wasm
 * locator: it resolves `libfive.wasm` beside itself via import.meta.url.
 * The loader therefore only needs to import the glue; everything else is
 * option mapping in `initFromFactory`.
 *
 * The layout contract — glue beside the compiled loader module — is what
 * the shipped package provides. In-repo tests bypass this seam with
 * `initFromFactory` until the packaging change finalizes the compiled
 * layout (design.md D2).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LibfiveError } from '../errors.js';
import type { ModuleFactory } from './types.js';

/**
 * Dynamically imports the Emscripten ES6 factory from beside this module.
 * Rejects with `LibfiveError` if the glue is missing or malformed.
 */
export async function loadFactory(): Promise<ModuleFactory> {
    const url = new URL('./libfive.js', import.meta.url);
    let mod: unknown;
    try {
        // The glue is a build artifact (dist/), not a source dependency;
        // bundlers must leave this dynamic import alone.
        mod = await import(/* @vite-ignore */ url.href);
    } catch (err) {
        throw new LibfiveError(
            `could not load the libfive module glue at ${url.href}; ` +
                'was the artifact built (scripts/build-wasm.sh)?',
            { cause: err },
        );
    }
    const factory = (mod as { default?: unknown }).default;
    if (typeof factory !== 'function') {
        throw new LibfiveError(
            `the module glue at ${url.href} does not export an Emscripten factory`,
        );
    }
    return factory as ModuleFactory;
}
