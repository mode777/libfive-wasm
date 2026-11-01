/*
 * libfive-wasm: the `Shape` class — the convenience tree-building API
 * modeled on libfive's Python bindings (AD-003, AD-010).
 *
 * Every wrapper owns exactly its root kernel tree (design D2): coerced
 * constants are released eagerly once the parent tree exists, `Shape`
 * operands remain owned by their creators, and the kernel's internal
 * refcounting keeps derived shapes alive after an operand is freed.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { LibfiveError } from '../errors.js';
import type { TreePtr } from '../ffi/types.js';
import type {
    ApiContext,
    BinaryMethodName,
    ResolvedCsg,
    UnaryMethodName,
} from './context.js';
import type { Token } from './lifecycle.js';
import { Mesh } from './mesh.js';
import type { MeshOptions, Region3, TFloat, Vec3Arg } from './types.js';

/** A scalar argument resolved for a kernel call: release frees owned trees. */
interface Coerced {
    readonly ptr: TreePtr;
    release(): void;
}

function describe(value: unknown): string {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'object') {
        return value.constructor?.name ?? 'object';
    }
    return `${typeof value} (${String(value)})`;
}

/**
 * A solid model as a functional-representation tree. Build shapes from
 * the instance factories (`libfive.x()`, `libfive.y()`, `libfive.z()`,
 * `libfive.constant(v)`, `libfive.var()`), combine them with the
 * arithmetic, math and CSG methods, evaluate them, and mesh them.
 *
 * Wherever a scalar is accepted a plain `number` is wrapped as a constant
 * tree automatically; `Shape` arguments are used as-is (shared, never
 * copied). Every method returns a new `Shape` and leaves its operands
 * usable. Call {@link free} when done — forgetting it is safe
 * (`FinalizationRegistry` net, AD-005) but can bloat the wasm heap under
 * load; `init({ debug: true })` warns when that happens.
 */
export class Shape {
    private readonly ctx: ApiContext;
    private readonly token: Token;

    /**
     * Wraps an existing kernel tree handle under this context's lifecycle
     * management. Not part of the documented surface — use the instance
     * factories or the instance-bound `Shape.fromTree` escape hatch.
     *
     * @internal
     */
    constructor(ctx: ApiContext, ptr: TreePtr) {
        this.ctx = ctx;
        this.token = ctx.lifecycle.register(this, 'Shape', ptr, (p) =>
            ctx.raw._libfive_tree_delete(p as TreePtr),
        );
    }

    /** The raw kernel tree handle (read-only convention). */
    get tree(): number {
        return this.ctx.lifecycle.requireAlive(this.token, 'tree');
    }

    /** Releases the wrapped kernel tree; idempotent. */
    free(): void {
        this.ctx.lifecycle.free(this.token);
    }

    private ptrFor(operation: string): TreePtr {
        return this.ctx.lifecycle.requireAlive(this.token, operation) as TreePtr;
    }

    /**
     * Resolves a scalar argument per the coercion rule: a number becomes
     * an owned constant tree (released eagerly by the caller once the
     * parent tree exists); a `Shape` is borrowed as-is.
     */
    private coerce(operation: string, value: TFloat): Coerced {
        if (typeof value === 'number') {
            const ptr = this.ctx.wrapTree(operation, this.ctx.raw._libfive_tree_const(value));
            return {
                ptr,
                release: () => this.ctx.raw._libfive_tree_delete(ptr),
            };
        }
        if (value instanceof Shape) {
            return { ptr: value.ptrFor(operation), release: () => {} };
        }
        throw new LibfiveError(
            `${operation}: expected a number or Shape, got ${describe(value)}`,
        );
    }

    /** Builds a new shape from a kernel result, releasing owned inputs. */
    private build(operation: string, ptr: TreePtr, coerced: Coerced[]): Shape {
        try {
            return new Shape(this.ctx, this.ctx.wrapTree(operation, ptr));
        } finally {
            for (const c of coerced) {
                c.release();
            }
        }
    }

    private binary(method: BinaryMethodName, other: TFloat): Shape {
        const operation = `Shape.${method}`;
        const a = this.ptrFor(operation);
        const b = this.coerce(operation, other);
        const op = this.ctx.binaryOpcodes[method];
        return this.build(operation, this.ctx.raw._libfive_tree_binary(op, a, b.ptr), [b]);
    }

    private unary(method: UnaryMethodName): Shape {
        const operation = `Shape.${method}`;
        const a = this.ptrFor(operation);
        const op = this.ctx.unaryOpcodes[method];
        return this.build(operation, this.ctx.raw._libfive_tree_unary(op, a), []);
    }

    /** Runs a resolved CSG spec: receiver is slot 0, operands follow. */
    private callCsg(spec: ResolvedCsg, operands: TFloat[]): Shape {
        const operation = `Shape.${spec.method}`;
        const minOperands =
            spec.args.length -
            1 -
            (spec.optionalFrom !== undefined ? spec.args.length - 1 - spec.optionalFrom : 0);
        if (operands.length < minOperands || operands.length > spec.args.length - 1) {
            const expected = spec.optionalFrom !== undefined
                ? `${minOperands}–${spec.args.length - 1}`
                : String(minOperands);
            throw new LibfiveError(
                `${operation}: wrong number of arguments (expected ${expected}, got ${operands.length})`,
            );
        }
        const coerced: Coerced[] = [];
        const callArgs: number[] = [];
        try {
            // Slot 0 of every `csg` signature is the receiver tree.
            const receiver: Coerced = {
                ptr: this.ptrFor(operation),
                release: () => {},
            };
            coerced.push(receiver);
            callArgs.push(receiver.ptr);
            let next = 0;
            // Remaining slots (tree or float — both are tree handles in
            // this ABI) each consume one operand, in order.
            for (let i = 1; i < spec.args.length; i++) {
                let value: TFloat;
                if (next < operands.length) {
                    value = operands[next++]!;
                } else if (spec.optionalFrom !== undefined) {
                    value = spec.optionalDefault ?? 0;
                } else {
                    // Unreachable when the arity check above passes; kept
                    // as a guard so optional defaults never mask misuse.
                    throw new LibfiveError(
                        `${operation}: wrong number of arguments (expected ${minOperands}, got ${operands.length})`,
                    );
                }
                const c = this.coerce(operation, value);
                coerced.push(c);
                callArgs.push(c.ptr);
            }
            const out = spec.fn(...callArgs) as TreePtr;
            // Wrap first, then release: the parent tree holds references
            // to every coerced child, so eager release is safe (design D2).
            const shape = new Shape(this.ctx, this.ctx.wrapTree(operation, out));
            return shape;
        } finally {
            // The single release point: covers coercion, validation and
            // kernel-call failure paths as well as the success path.
            for (const c of coerced) c.release();
        }
    }

    // ------------------------------------------------------------------
    // Arithmetic and math methods (kernel opcode table, AD-010)
    // ------------------------------------------------------------------

    add(other: TFloat): Shape {
        return this.binary('add', other);
    }
    sub(other: TFloat): Shape {
        return this.binary('sub', other);
    }
    mul(other: TFloat): Shape {
        return this.binary('mul', other);
    }
    min(other: TFloat): Shape {
        return this.binary('min', other);
    }
    max(other: TFloat): Shape {
        return this.binary('max', other);
    }
    div(other: TFloat): Shape {
        return this.binary('div', other);
    }
    atan2(other: TFloat): Shape {
        return this.binary('atan2', other);
    }
    mod(other: TFloat): Shape {
        return this.binary('mod', other);
    }
    compare(other: TFloat): Shape {
        return this.binary('compare', other);
    }
    /** Binary nth root: `s.nthRoot(n)` is the nth root of `s`. */
    nthRoot(other: TFloat): Shape {
        return this.binary('nthRoot', other);
    }

    abs(): Shape {
        return this.unary('abs');
    }
    square(): Shape {
        return this.unary('square');
    }
    sqrt(): Shape {
        return this.unary('sqrt');
    }
    sin(): Shape {
        return this.unary('sin');
    }
    cos(): Shape {
        return this.unary('cos');
    }
    tan(): Shape {
        return this.unary('tan');
    }
    asin(): Shape {
        return this.unary('asin');
    }
    acos(): Shape {
        return this.unary('acos');
    }
    atan(): Shape {
        return this.unary('atan');
    }
    exp(): Shape {
        return this.unary('exp');
    }
    log(): Shape {
        return this.unary('log');
    }
    neg(): Shape {
        return this.unary('neg');
    }

    // ------------------------------------------------------------------
    // CSG and blending methods (stdlib csg section; loftBetween arrives
    // with the stdlib-bindings pointer shims)
    // ------------------------------------------------------------------

    union(other: TFloat): Shape {
        return this.callCsg(this.ctx.csg.union!, [other]);
    }
    intersect(other: TFloat): Shape {
        return this.callCsg(this.ctx.csg.intersect!, [other]);
    }
    difference(other: TFloat): Shape {
        return this.callCsg(this.ctx.csg.difference!, [other]);
    }
    inverse(): Shape {
        return this.callCsg(this.ctx.csg.inverse!, []);
    }
    /** Expands (positive `o`) or contracts the shape by the offset. */
    offset(o: TFloat): Shape {
        return this.callCsg(this.ctx.csg.offset!, [o]);
    }
    /** Subtracts `b` expanded by `o` from this shape. */
    clearance(b: TFloat, o: TFloat): Shape {
        return this.callCsg(this.ctx.csg.clearance!, [b, o]);
    }
    /** A shell of the shape with the given offset. */
    shell(o: TFloat): Shape {
        return this.callCsg(this.ctx.csg.shell!, [o]);
    }
    /** Smooth blend; the alias of `blendExptUnit` (AD-010). */
    blend(b: TFloat, m: TFloat): Shape {
        return this.callCsg(this.ctx.csg.blend!, [b, m]);
    }
    blendExpt(b: TFloat, m: TFloat): Shape {
        return this.callCsg(this.ctx.csg.blendExpt!, [b, m]);
    }
    blendExptUnit(b: TFloat, m: TFloat): Shape {
        return this.callCsg(this.ctx.csg.blendExptUnit!, [b, m]);
    }
    blendRough(b: TFloat, m: TFloat): Shape {
        return this.callCsg(this.ctx.csg.blendRough!, [b, m]);
    }
    /** Blends the subtraction of `b` (offset `o`, default 0) from the shape. */
    blendDifference(b: TFloat, m: TFloat, o?: TFloat): Shape {
        const operands = o === undefined ? [b, m] : [b, m, o];
        return this.callCsg(this.ctx.csg.blendDifference!, operands);
    }
    /** Morphs between the shape (m = 0) and `b` (m = 1). */
    morph(b: TFloat, m: TFloat): Shape {
        return this.callCsg(this.ctx.csg.morph!, [b, m]);
    }
    /** A blended loft between the shape (at `zmin`) and `b` (at `zmax`). */
    loft(b: TFloat, zmin: TFloat, zmax: TFloat): Shape {
        return this.callCsg(this.ctx.csg.loft!, [b, zmin, zmax]);
    }

    // ------------------------------------------------------------------
    // Inspection and advanced operations
    // ------------------------------------------------------------------

    /** The kernel's Scheme-style form of the tree (copied and released). */
    toString(): string {
        const t = this.ptrFor('toString');
        const strPtr = this.ctx.raw._libfive_tree_print(t);
        if (!strPtr) {
            throw new LibfiveError('Shape.toString: the kernel failed to print the tree');
        }
        return this.ctx.raw.readKernelString(strPtr);
    }

    /** Whether the tree is a free variable. */
    isVar(): boolean {
        const t = this.ptrFor('isVar');
        return this.ctx.raw._libfive_tree_is_var(t) !== 0;
    }

    /** The constant value, or `undefined` when the tree is not a constant. */
    getConst(): number | undefined {
        const operation = 'Shape.getConst';
        const t = this.ptrFor(operation);
        const out = this.ctx.raw._malloc(4);
        try {
            this.ctx.raw.setValue(out, 0, 'i32');
            const value = this.ctx.raw._shim_tree_get_const(t, out);
            const ok = this.ctx.raw.getValue(out, 'i32');
            return ok !== 0 ? value : undefined;
        } finally {
            this.ctx.raw._free(out);
        }
    }

    /** Coordinate remapping: `q(x,y,z) = p(x'(x,y,z), y'(…), z'(…))`. */
    remap(x: TFloat, y: TFloat, z: TFloat): Shape {
        const operation = 'Shape.remap';
        const p = this.ptrFor(operation);
        const cx = this.coerce(operation, x);
        const cy = this.coerce(operation, y);
        const cz = this.coerce(operation, z);
        const out = this.ctx.raw._libfive_tree_remap(p, cx.ptr, cy.ptr, cz.ptr);
        return this.build(operation, out, [cx, cy, cz]);
    }

    /** A new, kernel-optimized shape; the original stays untouched. */
    optimized(): Shape {
        const operation = 'Shape.optimized';
        const t = this.ptrFor(operation);
        return this.build(operation, this.ctx.raw._libfive_tree_optimized(t), []);
    }

    // ------------------------------------------------------------------
    // Evaluation (tree-level shims; free variables evaluate as zero)
    // ------------------------------------------------------------------

    /**
     * Resolves a `Vec3Arg` into plain floats: numbers must be finite; a
     * `Shape` component must be a constant (its constant value is used).
     */
    private resolvePoint(p: Vec3Arg, operation: string): [number, number, number] {
        if (!Array.isArray(p) || p.length !== 3) {
            throw new LibfiveError(
                `${operation}: expected a [x, y, z] point`,
            );
        }
        return p.map((component) => {
            if (typeof component === 'number') {
                if (!Number.isFinite(component)) {
                    throw new LibfiveError(
                        `${operation}: point components must be finite, got ${component}`,
                    );
                }
                return component;
            }
            if (component instanceof Shape) {
                const c = component.getConst();
                if (c === undefined) {
                    throw new LibfiveError(
                        `${operation}: non-constant Shape components cannot act as coordinates`,
                    );
                }
                return c;
            }
            throw new LibfiveError(
                `${operation}: expected number or Shape components, got ${describe(component)}`,
            );
        }) as [number, number, number];
    }

    /** The value of the tree at a point. */
    evalF(p: Vec3Arg): number {
        const operation = 'Shape.evalF';
        const t = this.ptrFor(operation);
        const [x, y, z] = this.resolvePoint(p, operation);
        const vec = this.ctx.raw.allocVec3();
        try {
            vec.set(x, y, z);
            return this.ctx.raw._shim_tree_eval_f(t, vec.ptr);
        } finally {
            vec.free();
        }
    }

    /** Interval bounds guaranteed to contain the tree over the region. */
    evalR(region: Region3): { lower: number; upper: number } {
        const operation = 'Shape.evalR';
        const t = this.ptrFor(operation);
        if (!region || !Array.isArray(region.min) || !Array.isArray(region.max)) {
            throw new LibfiveError(`${operation}: expected a { min, max } region`);
        }
        const [xl, yl, zl] = this.resolvePoint(region.min, operation);
        const [xu, yu, zu] = this.resolvePoint(region.max, operation);
        const reg = this.ctx.raw.allocRegion3();
        const out = this.ctx.raw.allocIntervalOut();
        try {
            reg.set(xl, xu, yl, yu, zl, zu);
            this.ctx.raw._shim_tree_eval_r(t, reg.ptr, out.ptr);
            return out.read();
        } finally {
            reg.free();
            out.free();
        }
    }

    /** The gradient `[dx, dy, dz]` of the tree at a point. */
    evalD(p: Vec3Arg): [number, number, number] {
        const operation = 'Shape.evalD';
        const t = this.ptrFor(operation);
        const [x, y, z] = this.resolvePoint(p, operation);
        const vec = this.ctx.raw.allocVec3();
        const out = this.ctx.raw.allocVec3Out();
        try {
            vec.set(x, y, z);
            this.ctx.raw._shim_tree_eval_d(t, vec.ptr, out.ptr);
            return out.read();
        } finally {
            vec.free();
            out.free();
        }
    }

    // ------------------------------------------------------------------
    // Meshing (see mesh.ts for the Mesh type)
    // ------------------------------------------------------------------

    /**
     * Meshes the shape synchronously on the caller's thread (AD-009)
     * through the kernel's single-threaded entry point (AD-014).
     *
     * **`res` is the inverse of the mesher's minimum feature size** — the
     * kernel meshes with `min_feature = 1/res`, so larger values produce
     * finer meshes (a unit sphere in a 2.5-wide region: res 16 ≈ 12k
     * vertices, res 4 ≈ 800, res 1 ≈ 60). It is **not** a voxel count and
     * not a feature size itself: a value so small that `1/res` exceeds
     * the region size produces an empty mesh (zero triangles).
     *
     * The returned `Mesh` owns its data and outlives this shape; call
     * `mesh.free()` when done (views are valid until then).
     */
    mesh(options: MeshOptions): Mesh;
    mesh(min: Vec3Arg, max: Vec3Arg, res: number): Mesh;
    mesh(a: MeshOptions | Vec3Arg, b?: Vec3Arg, c?: number): Mesh {
        const operation = 'Shape.mesh';
        let region: Region3;
        let res: number;
        if (Array.isArray(a)) {
            if (!Array.isArray(b) || typeof c !== 'number') {
                throw new LibfiveError(
                    `${operation}: expected mesh({ region, res }) or mesh(min, max, res)`,
                );
            }
            region = { min: a, max: b };
            res = c;
        } else {
            if (!a || !Array.isArray(a.region?.min) || !Array.isArray(a.region?.max)) {
                throw new LibfiveError(`${operation}: expected a { region, res } options object`);
            }
            region = a.region;
            res = a.res;
        }
        if (typeof res !== 'number' || !Number.isFinite(res)) {
            throw new LibfiveError(
                `${operation}: res must be a finite number (the inverse of the mesher's minimum feature size — min_feature = 1/res, larger is finer — not a voxel count)`,
            );
        }
        const [xl, yl, zl] = this.resolvePoint(region.min, operation);
        const [xu, yu, zu] = this.resolvePoint(region.max, operation);
        if (!(xl < xu) || !(yl < yu) || !(zl < zu)) {
            throw new LibfiveError(
                `${operation}: region min must be strictly below max on every axis`,
            );
        }
        const t = this.ptrFor(operation);
        const reg = this.ctx.raw.allocRegion3();
        try {
            reg.set(xl, xu, yl, yu, zl, zu);
            const meshPtr = this.ctx.raw._shim_tree_render_mesh_st(t, reg.ptr, res);
            if (!meshPtr) {
                throw new LibfiveError(`${operation}: the kernel failed to render a mesh`);
            }
            return new Mesh(this.ctx, meshPtr);
        } finally {
            reg.free();
        }
    }
}

/**
 * The instance-bound `Shape` class: adds the `Shape.fromTree` escape
 * hatch, which needs the owning module's context. The constructor takes
 * just the tree handle — the context is captured in the closure.
 */
export type ShapeClass = (new (ptr: number) => Shape) & {
    /** Adopts a raw kernel tree handle (freed with the wrapper). */
    fromTree(ptr: number): Shape;
};

export function createShapeClass(ctx: ApiContext): ShapeClass {
    const Bound = class extends Shape {
        constructor(ptr: number) {
            super(ctx, ptr as TreePtr);
        }
    };
    Object.defineProperty(Bound, 'fromTree', {
        value: (ptr: number): Shape => {
            if (!ptr) {
                throw new LibfiveError(
                    'Shape.fromTree: received a null tree handle',
                );
            }
            return new Shape(ctx, ptr as TreePtr);
        },
        writable: false,
    });
    return Bound as unknown as ShapeClass;
}
