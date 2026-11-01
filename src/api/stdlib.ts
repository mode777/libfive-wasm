/*
 * libfive-wasm: the generated standard-library runtime (AD-017, AD-024).
 *
 * One marshalling path serves every generated stdlib declaration: scalar
 * `TFloat` coercion (plain numbers become constant trees owned by the call),
 * mixed-number/Shape vectors, integer slots, Latin-1 `text` strings, upstream
 * optional defaults, and eager release once the parent tree exists
 * (shape-api design D2). The instance-level functions and the `Shape` method
 * forms are both built from the generated spec table; method forms live on
 * the shared prototype and read each receiver's own context, so several
 * `init()` instances coexist.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LibfiveError } from '../errors.js';
import type { TreePtr, VoidPtr } from '../ffi/types.js';
import {
    STDLIB_ALIASES,
    STDLIB_SPECS,
} from '../gen/stdlib.js';
import type {
    StdlibArgSpec,
    StdlibFunctions,
    StdlibSpec,
} from '../gen/stdlib.js';
import type { ApiContext } from './context.js';
import { ShapeContext } from './internal.js';
import { Shape } from './shape.js';

/** A resolved generated shim on the module context. */
export type StdlibShim = (...args: number[]) => number;

/** Shape-typed access to a receiver's tree handle. */
interface Receiver {
    readonly tree: number;
}

function describe(value: unknown): string {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    if (typeof value === 'object') {
        return (value as { constructor?: { name?: string } }).constructor?.name ??
            'object';
    }
    return `${typeof value} (${String(value)})`;
}

function defaultFor(arg: StdlibArgSpec): number | number[] {
    const value = arg.defaultValue ?? 0;
    if (arg.kind === 'vec2') {
        return [value, value];
    }
    if (arg.kind === 'vec3') {
        return [value, value, value];
    }
    return value;
}

/** Validates an integral, finite 32-bit-range `int` slot. */
function coerceInt(operation: string, arg: StdlibArgSpec, value: unknown): number {
    if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        !Number.isInteger(value) ||
        value < -0x80000000 ||
        value > 0x7fffffff
    ) {
        throw new LibfiveError(
            `${operation}: argument '${arg.name}' must be a finite 32-bit ` +
                `integer, got ${describe(value)}`,
        );
    }
    return value;
}

/** Writes a NUL-terminated Latin-1 copy of `text` into wasm memory. */
function allocateLatin1(
    ctx: ApiContext,
    operation: string,
    arg: StdlibArgSpec,
    value: unknown,
): VoidPtr {
    if (typeof value !== 'string') {
        throw new LibfiveError(
            `${operation}: argument '${arg.name}' must be a string, got ` +
                describe(value),
        );
    }
    const bytes = new Uint8Array(value.length + 1);
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code > 0xff) {
            throw new LibfiveError(
                `${operation}: text characters must be in U+0000-U+00FF ` +
                    `(found U+${code.toString(16).padStart(4, '0')} at index ${i})`,
            );
        }
        bytes[i] = code;
    }
    bytes[value.length] = 0;
    const ptr = ctx.raw._malloc(bytes.length);
    ctx.raw.HEAPU8.set(bytes, ptr as number);
    return ptr;
}

/**
 * Coerces one scalar `TFloat` (or `libfive_tree`) argument. Numbers become
 * constant trees whose release is appended to `releases`; `Shape` arguments
 * stay owned by the caller and are borrowed through their liveness gate.
 */
function coerceScalar(
    ctx: ApiContext,
    operation: string,
    arg: StdlibArgSpec,
    value: unknown,
    releases: Array<() => void>,
): number {
    if (typeof value === 'number') {
        const ptr = ctx.raw._libfive_tree_const(value);
        if (!ptr) {
            throw new LibfiveError(
                `${operation}: the kernel could not create the constant for ` +
                    `argument '${arg.name}'`,
            );
        }
        releases.push(() => ctx.raw._libfive_tree_delete(ptr));
        return ptr;
    }
    if (value instanceof Shape) {
        return value.tree;
    }
    throw new LibfiveError(
        `${operation}: argument '${arg.name}' must be a number or Shape, ` +
            `got ${describe(value)}`,
    );
}

function coerceVector(
    ctx: ApiContext,
    operation: string,
    arg: StdlibArgSpec,
    value: unknown,
    length: 2 | 3,
    releases: Array<() => void>,
): number[] {
    if (!Array.isArray(value) || value.length !== length) {
        throw new LibfiveError(
            `${operation}: argument '${arg.name}' must be a ${length}-component ` +
                `vector, got ${describe(value)}`,
        );
    }
    return value.map((component) =>
        coerceScalar(ctx, operation, arg, component, releases),
    );
}

/**
 * Runs one generated stdlib call. `receiver` is the method-form `this`
 * (already borrowed); `args` holds only the explicit arguments, so optional
 * slots are filled from the header defaults here.
 */
export function invokeStdlib(
    ctx: ApiContext,
    spec: StdlibSpec,
    shim: StdlibShim,
    operation: string,
    receiver: Receiver | undefined,
    args: readonly unknown[],
): Shape {
    const offset = receiver === undefined ? 0 : 1;
    const explicitSlots = spec.args.length - offset;
    if (args.length > explicitSlots) {
        throw new LibfiveError(
            `${operation}: wrong number of arguments (expected at most ` +
                `${explicitSlots}, got ${args.length})`,
        );
    }

    const releases: Array<() => void> = [];
    const flat: number[] = [];
    let stringPtr: VoidPtr | undefined;

    try {
        if (receiver !== undefined) {
            flat.push(receiver.tree);
        }
        for (let i = offset; i < spec.args.length; i++) {
            const arg = spec.args[i]!;
            let value = args[i - offset];
            if (value === undefined) {
                if (!arg.optional) {
                    throw new LibfiveError(
                        `${operation}: missing required argument '${arg.name}'`,
                    );
                }
                value = defaultFor(arg);
            }
            switch (arg.kind) {
                case 'tree':
                case 'tfloat':
                    flat.push(
                        coerceScalar(ctx, operation, arg, value, releases),
                    );
                    break;
                case 'vec2':
                    flat.push(
                        ...coerceVector(
                            ctx,
                            operation,
                            arg,
                            value,
                            2,
                            releases,
                        ),
                    );
                    break;
                case 'vec3':
                    flat.push(
                        ...coerceVector(
                            ctx,
                            operation,
                            arg,
                            value,
                            3,
                            releases,
                        ),
                    );
                    break;
                case 'int':
                    flat.push(coerceInt(operation, arg, value));
                    break;
                case 'string': {
                    const ptr = allocateLatin1(ctx, operation, arg, value);
                    stringPtr = ptr;
                    flat.push(ptr);
                    break;
                }
            }
        }

        const result = shim(...flat);
        if (result === 0) {
            throw new LibfiveError(
                `${operation}: the kernel did not return a tree`,
            );
        }
        return new Shape(ctx, result as TreePtr);
    } finally {
        for (const release of releases) {
            release();
        }
        if (stringPtr !== undefined) {
            ctx.raw._free(stringPtr);
        }
    }
}

const specsByName = new Map(
    STDLIB_SPECS.map((spec) => [spec.jsName, spec] as const),
);

let methodsInstalled = false;

function installMethods(): void {
    if (methodsInstalled) {
        return;
    }
    methodsInstalled = true;

    const define = (
        name: string,
        spec: StdlibSpec,
        operation: string,
    ): void => {
        Object.defineProperty(Shape.prototype, name, {
            configurable: true,
            writable: true,
            enumerable: false,
            value: function (this: Shape, ...args: unknown[]): Shape {
                const ctx = this[ShapeContext];
                return invokeStdlib(
                    ctx,
                    spec,
                    ctx.stdlib.shimFor(spec.jsName),
                    operation,
                    this,
                    args,
                );
            },
        });
    };

    for (const spec of STDLIB_SPECS) {
        if (spec.method !== undefined) {
            define(spec.method, spec, `Shape.${spec.method}`);
        }
    }
    for (const alias of STDLIB_ALIASES) {
        if (alias.method === undefined) {
            continue;
        }
        const target = specsByName.get(alias.aliasOf);
        if (target === undefined) {
            throw new LibfiveError(
                `the generated stdlib alias '${alias.jsName}' targets an ` +
                    `unknown function '${alias.aliasOf}'`,
            );
        }
        define(alias.method, target, `Shape.${alias.method}`);
    }
}

/** The instance-level function map and its resolved generated shims. */
export class StdlibRuntime {
    private readonly shims = new Map<string, StdlibShim>();
    readonly functions: StdlibFunctions;

    constructor(private readonly ctx: ApiContext) {
        const source = ctx.module as unknown as Record<string, unknown>;
        const functions: Record<string, (...args: unknown[]) => Shape> = {};

        for (const spec of STDLIB_SPECS) {
            const key = `_${spec.shim}`;
            const fn = source[key];
            if (typeof fn !== 'function') {
                throw new LibfiveError(
                    `the artifact does not export the generated stdlib shim ` +
                        `'${key}' needed by '${spec.jsName}'`,
                );
            }
            const shim = fn as StdlibShim;
            this.shims.set(spec.jsName, shim);
            functions[spec.jsName] = (...args: unknown[]) =>
                invokeStdlib(ctx, spec, shim, spec.jsName, undefined, args);
        }

        for (const alias of STDLIB_ALIASES) {
            const target = specsByName.get(alias.aliasOf);
            const shim = this.shims.get(alias.aliasOf);
            if (target === undefined || shim === undefined) {
                throw new LibfiveError(
                    `the generated stdlib alias '${alias.jsName}' targets an ` +
                        `unknown function '${alias.aliasOf}'`,
                );
            }
            functions[alias.jsName] = (...args: unknown[]) =>
                invokeStdlib(ctx, target, shim, alias.jsName, undefined, args);
        }

        this.functions = functions as unknown as StdlibFunctions;
        installMethods();
    }

    /** The resolved shim for a generated declaration (method forms). */
    shimFor(jsName: string): StdlibShim {
        const shim = this.shims.get(jsName);
        if (shim === undefined) {
            throw new LibfiveError(
                `no generated stdlib shim is registered for '${jsName}'`,
            );
        }
        return shim;
    }
}
