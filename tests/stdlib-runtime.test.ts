/*
 * libfive-wasm tests: the generated stdlib marshalling runtime against a
 * stub module (stdlib-bindings task 2.1). No wasm artifact is needed.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from 'vitest';
import type { ApiContext } from '../src/api/context.js';
import { Lifecycle } from '../src/api/lifecycle.js';
import { Shape } from '../src/api/shape.js';
import { StdlibRuntime } from '../src/api/stdlib.js';
import { STDLIB_SPECS } from '../src/gen/stdlib.js';
import type { TreePtr } from '../src/ffi/types.js';

interface ShimCall {
    name: string;
    args: number[];
}

/** A stub context with a fake module, tree allocator and heap. */
class Stub {
    readonly shimCalls: ShimCall[] = [];
    readonly constValues: number[] = [];
    readonly deleted: number[] = [];
    readonly malloced: number[] = [];
    readonly freed: number[] = [];
    readonly ctx: ApiContext;
    readonly runtime: StdlibRuntime;
    private nextPtr = 1;
    private nextAlloc = 1024;

    constructor() {
        let nextPtr = 100;
        const module: Record<string, unknown> = {};
        for (const spec of STDLIB_SPECS) {
            const name = spec.shim;
            if (module[`_${name}`] !== undefined) {
                continue;
            }
            module[`_${name}`] = (...args: number[]) => {
                this.shimCalls.push({ name, args });
                return nextPtr++;
            };
        }

        const stubCtx = {
            module,
            lifecycle: new Lifecycle(false),
            raw: {
                HEAPU8: new Uint8Array(65536),
                _libfive_tree_const: (value: number) => {
                    this.constValues.push(value);
                    return this.nextPtr++ as TreePtr;
                },
                _libfive_tree_delete: (ptr: TreePtr) => {
                    this.deleted.push(ptr);
                },
                _malloc: (size: number) => {
                    const ptr = this.nextAlloc;
                    this.nextAlloc += size + 8;
                    this.malloced.push(ptr);
                    return ptr;
                },
                _free: (ptr: number) => {
                    this.freed.push(ptr);
                },
            },
        } as unknown as ApiContext;

        this.ctx = stubCtx;
        this.runtime = new StdlibRuntime(stubCtx);
        (stubCtx as unknown as { stdlib: StdlibRuntime }).stdlib = this.runtime;
    }

    call(name: string, ...args: unknown[]): Shape {
        const functions = this.runtime.functions as unknown as Record<
            string,
            (...values: unknown[]) => Shape
        >;
        const fn = functions[name];
        if (fn === undefined) {
            throw new Error(`no generated function '${name}'`);
        }
        return fn(...args);
    }

    shape(ptr = 9000): Shape {
        return new Shape(this.ctx, ptr as TreePtr);
    }

    lastCall(): ShimCall {
        const call = this.shimCalls.at(-1);
        if (call === undefined) {
            throw new Error('no shim call recorded');
        }
        return call;
    }

    heapBytes(ptr: number, length: number): number[] {
        const heap = (this.ctx.raw as unknown as { HEAPU8: Uint8Array }).HEAPU8;
        return [...heap.slice(ptr, ptr + length)];
    }
}

describe('stdlib marshalling runtime (task 2.1)', () => {
    it('flattens scalars and vectors into the shim call', () => {
        const stub = new Stub();
        const result = stub.call('sphere', 1, [2, 3, 4]);
        const call = stub.lastCall();
        expect(call.name).toBe('shim_stdlib_sphere');
        expect(call.args).toHaveLength(4);
        expect(stub.constValues).toEqual([1, 2, 3, 4]);
        expect(result.tree).toBeGreaterThan(0);
        expect(call.args).not.toContain(result.tree);
        // Every coerced constant is released once the tree exists.
        expect([...stub.deleted].sort()).toEqual([...call.args].sort());
    });

    it('borrows Shape arguments without freeing them', () => {
        const stub = new Stub();
        const operand = stub.shape(777);
        const result = stub.call('move', operand, [1, 2, 3]);
        const call = stub.lastCall();
        expect(call.name).toBe('shim_stdlib_move');
        expect(call.args[0]).toBe(777);
        expect(call.args).toHaveLength(4);
        expect(stub.deleted).not.toContain(777);
        expect(result.tree).not.toBe(777);
        expect(operand.tree).toBe(777);
        result.free();
        operand.free();
        expect(stub.deleted).toContain(777);
    });

    it('applies upstream defaults for omitted arguments', () => {
        const stub = new Stub();
        stub.call('sphere', 1).free();
        expect(stub.lastCall().args).toHaveLength(4);
        expect(stub.constValues).toEqual([1, 0, 0, 0]);

        stub.constValues.length = 0;
        stub.call('reflectX', stub.shape()).free();
        expect(stub.lastCall().args).toHaveLength(2);
        expect(stub.constValues).toEqual([0]);

        stub.constValues.length = 0;
        stub.call('boxCentered', [1, 2, 3]).free();
        expect(stub.lastCall().args).toHaveLength(6);
        expect(stub.constValues).toEqual([1, 2, 3, 0, 0, 0]);
    });

    it('passes int slots as plain numbers', () => {
        const stub = new Stub();
        stub.call('polygon', 1, 6).free();
        const call = stub.lastCall();
        expect(call.args).toHaveLength(4);
        expect(call.args[1]).toBe(6);
        expect(() => stub.call('polygon', 1, 6.5)).toThrow(
            /polygon: argument 'n' must be a finite 32-bit integer/,
        );
        expect(() => stub.call('polygon', 1, Number.NaN)).toThrow(
            /finite 32-bit integer/,
        );
    });

    it('encodes text as Latin-1 and frees the buffer', () => {
        const stub = new Stub();
        stub.call('text', 'A°', [0, 0]).free();
        const call = stub.lastCall();
        const ptr = call.args[0]!;
        expect(stub.heapBytes(ptr, 3)).toEqual([0x41, 0xb0, 0]);
        expect(stub.freed).toContain(ptr);
        expect(() => stub.call('text', '☃')).toThrow(
            /text characters must be in U\+0000-U\+00FF/,
        );
        expect(() => stub.call('text', 1)).toThrow(/must be a string/);
    });

    it('rejects wrong scalar and vector kinds before the kernel call', () => {
        const stub = new Stub();
        expect(() => stub.call('sphere', '1')).toThrow(
            /sphere: argument 'radius' must be a number or Shape/,
        );
        expect(stub.shimCalls).toHaveLength(0);
        expect(() => stub.call('box', [0, 0], [1, 1, 1])).toThrow(
            /box: argument 'a' must be a 3-component vector, got array/,
        );
        expect(stub.shimCalls).toHaveLength(0);
        expect(() => stub.call('sphere', 1, [0, 0])).toThrow(
            /sphere: argument 'center' must be a 3-component vector/,
        );
        // Radius coerced before the centre failed; it is still released.
        expect(stub.deleted).toHaveLength(1);
    });

    it('releases coerced constants when the kernel fails', () => {
        const stub = new Stub();
        const module = stub.ctx.module as unknown as Record<string, unknown>;
        module._shim_stdlib_sphere = () => 0;
        const runtime = new StdlibRuntime(stub.ctx);
        const functions = runtime.functions as unknown as Record<
            string,
            (...values: unknown[]) => Shape
        >;
        expect(() => functions.sphere!(1)).toThrow(
            /sphere: the kernel did not return a tree/,
        );
        expect(stub.deleted).toHaveLength(4);
    });

    it('supports method forms with the receiver as the first argument', () => {
        const stub = new Stub();
        const a = stub.shape(11);
        const b = stub.shape(22);
        const union = a.union(b);
        const call = stub.lastCall();
        expect(call.name).toBe('shim_stdlib_union');
        expect(call.args).toEqual([11, 22]);
        expect(union).not.toBe(a);
        expect(a.tree).toBe(11);
        expect(b.tree).toBe(22);
        union.free();
        a.free();
        b.free();

        // Alias methods route to their target declaration.
        const polar = stub.shape(33);
        polar.arrayPolar(8).free();
        expect(stub.lastCall().name).toBe('shim_stdlib_array_polar_z');
        expect(stub.lastCall().args[0]).toBe(33);
        polar.free();
    });

    it('reports missing and extra arguments', () => {
        const stub = new Stub();
        expect(() => stub.call('clearance', stub.shape())).toThrow(
            /clearance: missing required argument 'b'/,
        );
        expect(() => stub.call('emptiness', 1)).toThrow(
            /emptiness: wrong number of arguments/,
        );
    });
});
