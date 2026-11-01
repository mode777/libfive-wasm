/*
 * libfive-wasm: kernel-object lifecycle machinery (AD-005).
 *
 * Every wasm-backed wrapper (`Shape`, `Mesh`) holds a token whose `alive`
 * flag is cleared by whichever release path runs first — the explicit
 * `free()` or the `FinalizationRegistry` safety net — so release is
 * exactly-once and `free()` is idempotent. `debug: true` instances warn
 * when the registry, not the caller, released an object.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LibfiveError } from '../errors.js';

/** The kinds of wasm-backed wrappers this package manages. */
export type ObjectKind = 'Shape' | 'Mesh';

/** A kernel-object handle under lifecycle management. */
export interface Token {
    /** The wrapped wasm pointer (wasm offsets are 32-bit numbers). */
    readonly ptr: number;
    /** Which wrapper kind owns this object (names errors/warnings). */
    readonly kind: ObjectKind;
    /** The kernel call that releases the wrapped object. */
    readonly deleter: (ptr: number) => void;
    /** Cleared by whichever release path runs first. */
    alive: boolean;
}

/**
 * Releases a token if it is still alive; a second call (or a registry
 * callback racing an explicit `free()`) is a no-op. With `debug`, a
 * registry-driven release warns that the caller forgot `free()` (AD-005).
 */
export function releaseToken(token: Token, debug: boolean): void {
    if (!token.alive) {
        return;
    }
    token.alive = false;
    token.deleter(token.ptr);
    if (debug) {
        console.warn(
            `[libfive-wasm] ${token.kind} was reclaimed by garbage collection; ` +
                'call free() to release kernel objects deterministically',
        );
    }
}

/**
 * Per-instance lifecycle manager: the registry is scoped to one module
 * instance's heap, matching js-loader's independent-instance guarantee.
 */
export class Lifecycle {
    /**
     * The registry callback, exposed so tests can simulate a
     * garbage-collection-driven release deterministically.
     */
    readonly collect: (token: Token) => void;

    private readonly registry: FinalizationRegistry<Token>;

    constructor(readonly debug: boolean) {
        this.collect = (token) => releaseToken(token, debug);
        this.registry = new FinalizationRegistry(this.collect);
    }

    /**
     * Registers a kernel object against its JS wrapper: when the wrapper
     * is collected, the token is released through {@link releaseToken}.
     */
    register(
        target: object,
        kind: ObjectKind,
        ptr: number,
        deleter: (ptr: number) => void,
    ): Token {
        const token: Token = { ptr, kind, deleter, alive: true };
        this.registry.register(target, token, token);
        return token;
    }

    /** Explicit free: idempotent, releases exactly once. */
    free(token: Token): void {
        if (!token.alive) {
            return;
        }
        token.alive = false;
        try {
            token.deleter(token.ptr);
        } finally {
            this.registry.unregister(token);
        }
    }

    /**
     * The use-after-free gate: returns the wrapped pointer for an alive
     * object, throws a `LibfiveError` naming the freed kind and the
     * attempted operation otherwise.
     */
    requireAlive(token: Token, operation: string): number {
        if (!token.alive) {
            throw new LibfiveError(
                `cannot use a freed ${token.kind} in ${operation}`,
            );
        }
        return token.ptr;
    }
}
