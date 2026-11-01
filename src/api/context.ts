/*
 * libfive-wasm: the per-instance convenience-API context.
 *
 * One ApiContext exists per `init()` instance. It owns the lifecycle
 * manager, resolves the opcode table eagerly, and constructs the generated
 * stdlib runtime (design D3): an artifact that stops exporting a needed
 * opcode or generated stdlib shim fails `init()` with a named
 * `LibfiveError` instead of failing later inside user code.
 *
 * The curated `raw` namespace deliberately stays free of stdlib functions
 * (AD-011, AD-017); the generated runtime calls the flat shims through the
 * module context directly (AD-024).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LibfiveError } from '../errors.js';
import { createRaw } from '../ffi/raw.js';
import type { LibfiveModule, RawLibfive, TreePtr } from '../ffi/types.js';
import { Lifecycle } from './lifecycle.js';
import { StdlibRuntime } from './stdlib.js';

/** Binary math methods: JS name → kernel opcode name (AD-010). */
export const BINARY_OPCODE_NAMES = {
    add: 'add',
    sub: 'sub',
    mul: 'mul',
    min: 'min',
    max: 'max',
    div: 'div',
    atan2: 'atan2',
    pow: 'pow',
    mod: 'mod',
    compare: 'compare',
    nthRoot: 'nth-root',
} as const;
export type BinaryMethodName = keyof typeof BINARY_OPCODE_NAMES;

/** Unary math methods: JS name → kernel opcode name (AD-010). */
export const UNARY_OPCODE_NAMES = {
    abs: 'abs',
    square: 'square',
    sqrt: 'sqrt',
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    exp: 'exp',
    log: 'log',
    neg: 'neg',
} as const;
export type UnaryMethodName = keyof typeof UNARY_OPCODE_NAMES;

function resolveOpcodes<Names extends Record<string, string>>(
    raw: RawLibfive,
    names: Names,
    kind: 'binary' | 'unary',
): Record<keyof Names, number> {
    const resolved = {} as Record<keyof Names, number>;
    for (const [method, opcodeName] of Object.entries(names)) {
        try {
            resolved[method as keyof Names] = raw.opcodeByName(opcodeName);
        } catch (err) {
            throw new LibfiveError(
                `the artifact does not resolve the ${kind} opcode ` +
                    `'${opcodeName}' needed by the Shape method table`,
                { cause: err },
            );
        }
    }
    return resolved;
}

/** Everything a wrapper needs to reach the kernel and manage lifetimes. */
export class ApiContext {
    readonly raw: RawLibfive;
    readonly lifecycle: Lifecycle;
    readonly binaryOpcodes: Record<BinaryMethodName, number>;
    readonly unaryOpcodes: Record<UnaryMethodName, number>;
    readonly stdlib: StdlibRuntime;

    constructor(readonly module: LibfiveModule, readonly debug: boolean) {
        this.raw = createRaw(module);
        this.lifecycle = new Lifecycle(debug);
        this.binaryOpcodes = resolveOpcodes(this.raw, BINARY_OPCODE_NAMES, 'binary');
        this.unaryOpcodes = resolveOpcodes(this.raw, UNARY_OPCODE_NAMES, 'unary');
        this.stdlib = new StdlibRuntime(this);
    }

    /** Wraps a kernel-returned tree handle, rejecting NULL results. */
    wrapTree(operation: string, ptr: TreePtr): TreePtr {
        if (!ptr) {
            throw new LibfiveError(
                `${operation}: the kernel did not return a tree`,
            );
        }
        return ptr;
    }
}
