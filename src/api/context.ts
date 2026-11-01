/*
 * libfive-wasm: the per-instance convenience-API context.
 *
 * One ApiContext exists per `init()` instance. It owns the lifecycle
 * manager and resolves the method tables eagerly against the live
 * artifact (design D3): an artifact that stops exporting a needed opcode
 * or stdlib symbol fails `init()` with a named `LibfiveError` instead of
 * failing later inside user code.
 *
 * CSG entries bind the stdlib C symbols through the module context
 * directly (design D4): the curated `raw` namespace deliberately stays
 * free of stdlib functions (AD-011, AD-017), while the artifact exports
 * every `LIBFIVE_STDLIB` symbol with a prepended underscore (AD-022 —
 * C `_union` becomes module key `__union`).
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

/** Binary math methods: JS name → kernel opcode name (AD-010). */
export const BINARY_OPCODE_NAMES = {
    add: 'add',
    sub: 'sub',
    mul: 'mul',
    min: 'min',
    max: 'max',
    div: 'div',
    atan2: 'atan2',
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

/**
 * One C stdlib `csg`-section function. Slot kinds follow the C signature
 * in order (slot 0 is the receiver shape); in this ABI `tfloat` is also a
 * tree handle, so every slot receives a tree. Optional trailing `float`
 * slots take the upstream generator's `__N` default (parse.py reads the
 * suffix as the value, e.g. `blend_difference`'s `o__0` defaults to 0).
 */
export interface CsgSpec {
    /** JS method name. */
    method: string;
    /** C stdlib symbol (verbatim). */
    cName: string;
    /** C signature slot kinds; slot 0 is the receiver. */
    args: Array<'tree' | 'float'>;
    /** Operand index (after the receiver) from which slots are optional. */
    optionalFrom?: number;
    /** Value used for omitted optional slots (upstream `__N` default). */
    optionalDefault?: number;
}

/** The stdlib `csg` section, minus struct-by-value entry points (D4). */
export const CSG_TABLE: CsgSpec[] = [
    { method: 'union', cName: '_union', args: ['tree', 'tree'] },
    { method: 'intersect', cName: 'intersection', args: ['tree', 'tree'] },
    { method: 'difference', cName: 'difference', args: ['tree', 'tree'] },
    { method: 'inverse', cName: 'inverse', args: ['tree'] },
    { method: 'offset', cName: 'offset', args: ['tree', 'float'] },
    { method: 'clearance', cName: 'clearance', args: ['tree', 'tree', 'float'] },
    { method: 'shell', cName: 'shell', args: ['tree', 'float'] },
    { method: 'blend', cName: 'blend_expt_unit', args: ['tree', 'tree', 'float'] },
    { method: 'blendExpt', cName: 'blend_expt', args: ['tree', 'tree', 'float'] },
    {
        method: 'blendExptUnit',
        cName: 'blend_expt_unit',
        args: ['tree', 'tree', 'float'],
    },
    { method: 'blendRough', cName: 'blend_rough', args: ['tree', 'tree', 'float'] },
    {
        method: 'blendDifference',
        cName: 'blend_difference',
        args: ['tree', 'tree', 'float', 'float'],
        optionalFrom: 2,
        optionalDefault: 0,
    },
    { method: 'morph', cName: 'morph', args: ['tree', 'tree', 'float'] },
    { method: 'loft', cName: 'loft', args: ['tree', 'tree', 'float', 'float'] },
];

export interface ResolvedCsg extends CsgSpec {
    /** The stdlib function on the module context. */
    fn: (...args: number[]) => number;
}

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

function resolveCsg(module: LibfiveModule): Record<string, ResolvedCsg> {
    const resolved: Record<string, ResolvedCsg> = {};
    const source = module as unknown as Record<string, unknown>;
    for (const spec of CSG_TABLE) {
        const key = `_${spec.cName}`;
        const fn = source[key];
        if (typeof fn !== 'function') {
            throw new LibfiveError(
                `the artifact does not export the stdlib symbol '${key}' ` +
                    `needed by the Shape method ${spec.method}`,
            );
        }
        resolved[spec.method] = {
            ...spec,
            fn: fn as (...args: number[]) => number,
        };
    }
    return resolved;
}

/** Everything a wrapper needs to reach the kernel and manage lifetimes. */
export class ApiContext {
    readonly raw: RawLibfive;
    readonly lifecycle: Lifecycle;
    readonly binaryOpcodes: Record<BinaryMethodName, number>;
    readonly unaryOpcodes: Record<UnaryMethodName, number>;
    readonly csg: Record<string, ResolvedCsg>;

    constructor(module: LibfiveModule, readonly debug: boolean) {
        this.raw = createRaw(module);
        this.lifecycle = new Lifecycle(debug);
        this.binaryOpcodes = resolveOpcodes(this.raw, BINARY_OPCODE_NAMES, 'binary');
        this.unaryOpcodes = resolveOpcodes(this.raw, UNARY_OPCODE_NAMES, 'unary');
        this.csg = resolveCsg(module);
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
