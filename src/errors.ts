/*
 * libfive-wasm package error type.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * The error type thrown by libfive-wasm.
 *
 * The loader throws it when the wasm artifact cannot be loaded or
 * instantiated and for option misuse. Later package layers (object
 * lifetimes, misuse validation) extend its use; kernel-side failures that
 * reach JavaScript as thrown errors are always bugs in the shim coverage.
 */
export class LibfiveError extends Error {
    /** Creates an error with `name` set to `"LibfiveError"`. */
    public constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LibfiveError';
    }
}
