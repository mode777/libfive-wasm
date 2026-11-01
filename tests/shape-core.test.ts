/*
 * libfive-wasm tests: the Shape convenience core against the real
 * artifact (construction, coercion, opcode methods, inspection,
 * evaluation — tasks 2.1–2.4).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initFromFactory } from '../src/loader/index.js';
import { ApiContext, BINARY_OPCODE_NAMES, UNARY_OPCODE_NAMES } from '../src/api/context.js';
import { LibfiveError } from '../src/index.js';
import type { Region3 } from '../src/index.js';
import { loadRealFactory } from './support/artifact.js';
import type { Libfive } from '../src/index.js';
import type { LibfiveModule } from '../src/ffi/types.js';

let libfive: Libfive;

beforeAll(async () => {
    const factory = await loadRealFactory();
    libfive = await initFromFactory(factory, { debug: false });
});

/** sqrt(x² + y² + z²) − 1, the api-design.md hand-built unit sphere. */
function makeSphere(): ReturnType<Libfive['x']> {
    return libfive
        .x()
        .square()
        .add(libfive.y().square())
        .add(libfive.z().square())
        .sqrt()
        .sub(1);
}

describe('construction and coercion (task 2.1)', () => {
    it('coordinate shapes evaluate as coordinates', () => {
        const x = libfive.x();
        const y = libfive.y();
        const z = libfive.z();
        try {
            expect(x.evalF([3, 1, 2])).toBeCloseTo(3, 5);
            expect(y.evalF([3, 1, 2])).toBeCloseTo(1, 5);
            expect(z.evalF([3, 1, 2])).toBeCloseTo(2, 5);
        } finally {
            x.free();
            y.free();
            z.free();
        }
    });

    it('constant and variable shapes are distinct and flagged', () => {
        const c = libfive.constant(1.5);
        const v = libfive.var();
        try {
            expect(c.evalF([9, 9, 9])).toBeCloseTo(1.5, 5);
            expect(c.isVar()).toBe(false);
            expect(v.isVar()).toBe(true);
            const c2 = libfive.constant(1.5);
            expect(c2.tree).not.toBe(c.tree);
            c2.free();
        } finally {
            c.free();
            v.free();
        }
    });

    it('number coercion is equivalent to an explicit constant', () => {
        const implicit = libfive.x().add(2);
        const explicit = libfive.x().add(libfive.constant(2));
        try {
            expect(implicit.evalF([1, 5, 0])).toBeCloseTo(3, 5);
            expect(explicit.evalF([1, 5, 0])).toBeCloseTo(3, 5);
        } finally {
            implicit.free();
            explicit.free();
        }
    });

    it('vector components coerce independently (number | Shape)', () => {
        const zero = libfive.constant(0);
        const sphere = makeSphere();
        try {
            const point = [2, zero, zero] as const;
            expect(sphere.evalF(point as unknown as [number, number, number])).toBeCloseTo(1, 5);
        } finally {
            zero.free();
            sphere.free();
        }
    });

    it('wrong argument kinds throw LibfiveError before any kernel call', () => {
        const s = libfive.x();
        try {
            const constSpy = vi.spyOn(libfive.raw, '_libfive_tree_const');
            const binarySpy = vi.spyOn(libfive.raw, '_libfive_tree_binary');
            try {
                expect(() => s.add('nope' as never)).toThrow(LibfiveError);
                expect(() => (s as never as { add(v: unknown): unknown }).add({} as never)).toThrow(
                    /Shape\.add.*expected a number or Shape/,
                );
                expect(constSpy).not.toHaveBeenCalled();
                expect(binarySpy).not.toHaveBeenCalled();
            } finally {
                constSpy.mockRestore();
                binarySpy.mockRestore();
            }
        } finally {
            s.free();
        }
    });

    it('wrong arity throws LibfiveError naming the method', () => {
        const s = libfive.x();
        const b = libfive.y();
        try {
            // Plain-JS callers omitting operands leave the argument slots
            // undefined; the generated stdlib marshaller rejects the call
            // with the operation name before any kernel call (TS callers
            // get a type error instead).
            expect(() => (s as never as { union(): unknown }).union()).toThrow(
                /Shape\.union: missing required argument 'b'/,
            );
            expect(() =>
                (s as never as { clearance(v: unknown): unknown }).clearance(b),
            ).toThrow(/Shape\.clearance: missing required argument 'offset'/);
        } finally {
            b.free();
            s.free();
        }
    });
});

describe('arithmetic and math methods (task 2.2)', () => {
    it('the hand-built sphere evaluates negative inside, positive outside', () => {
        const sphere = makeSphere();
        try {
            const inside = sphere.evalR({
                min: [-0.2, -0.2, -0.2],
                max: [0.2, 0.2, 0.2],
            });
            expect(inside.upper).toBeLessThan(0);
            const outside = sphere.evalR({
                min: [3, 0, 0],
                max: [4, 1, 1],
            });
            expect(outside.lower).toBeGreaterThan(0);
        } finally {
            sphere.free();
        }
    });

    it('every api-design.md method name resolves and builds', () => {
        const base = libfive.x();
        try {
            for (const method of Object.keys(BINARY_OPCODE_NAMES)) {
                const out = (base as unknown as Record<string, (v: number) => unknown>)[method]!(1);
                expect(out).toBeInstanceOf(Object);
                (out as { free(): void }).free();
            }
            for (const method of Object.keys(UNARY_OPCODE_NAMES)) {
                const operand = libfive.constant(0.5);
                const out = (
                    operand as unknown as Record<string, () => unknown>
                )[method]!();
                expect(out).toBeInstanceOf(Object);
                (out as { free(): void }).free();
                operand.free();
            }
        } finally {
            base.free();
        }
    });

    it('the Shape surface contains exactly the api-design.md method table', () => {
        const proto = Object.getPrototypeOf(libfive.x()) as Record<string, unknown>;
        for (const method of [
            ...Object.keys(BINARY_OPCODE_NAMES),
            ...Object.keys(UNARY_OPCODE_NAMES),
        ]) {
            expect(proto[method], `missing method ${method}`).toBeTypeOf('function');
        }
        // Generated stdlib method forms are installed from the header
        // (stdlib-bindings, AD-024); loftBetween is now callable.
        expect(proto.loftBetween).toBeTypeOf('function');
        expect(proto.rotateZ).toBeTypeOf('function');
    });

    it('pow reproduces repeated multiplication', () => {
        const powered = libfive.x().pow(3);
        const multiplied = libfive.x().mul(libfive.x()).mul(libfive.x());
        try {
            for (const x of [-2, -0.5, 0, 0.5, 2]) {
                expect(powered.evalF([x, 0, 0])).toBeCloseTo(
                    multiplied.evalF([x, 0, 0]),
                    4,
                );
            }
        } finally {
            powered.free();
            multiplied.free();
        }
    });

    it('methods return new shapes; operands stay usable and freeable once', () => {
        const a = libfive.x();
        try {
            const b = a.add(1);
            const c = a.mul(2);
            try {
                expect(b).not.toBe(c);
                expect(a.evalF([3, 0, 0])).toBeCloseTo(3, 5);
                expect(b.evalF([3, 0, 0])).toBeCloseTo(4, 5);
                expect(c.evalF([3, 0, 0])).toBeCloseTo(6, 5);
            } finally {
                b.free();
                c.free();
            }
            a.free();
            expect(() => a.free()).not.toThrow();
        } finally {
            a.free();
        }
    });

    it('a kernel opcode name that stops resolving fails the table construction', () => {
        // Stub module whose opcode lookup rejects 'nth-root': the eager
        // table must fail init with a named LibfiveError (design D3).
        const strings = new Map<number, string>();
        let nextPtr = 16;
        const module = {
            HEAPU8: new Uint8Array(8),
            HEAPF32: new Float32Array(8),
            lengthBytesUTF8: (t: string) => new TextEncoder().encode(t).length,
            stringToUTF8: (t: string, out: number) => {
                strings.set(out, t);
            },
            UTF8ToString: (ptr: number) => strings.get(ptr) ?? '',
            _malloc: (size: number) => {
                const ptr = nextPtr;
                nextPtr += size;
                return ptr;
            },
            _free: () => {},
            _libfive_opcode_enum: (ptr: number) =>
                strings.get(ptr) === 'nth-root' ? -1 : 1,
            __union: () => 0,
            _intersection: () => 0,
            _inverse: () => 0,
            _difference: () => 0,
            _offset: () => 0,
            _clearance: () => 0,
            _shell: () => 0,
            _blend_expt: () => 0,
            _blend_expt_unit: () => 0,
            _blend_rough: () => 0,
            _blend_difference: () => 0,
            _morph: () => 0,
            _loft: () => 0,
        } as unknown as LibfiveModule;
        expect(() => new ApiContext(module, false)).toThrow(
            /binary opcode 'nth-root' needed by the Shape method table/,
        );
        expect(() => new ApiContext(module, false)).toThrow(LibfiveError);
    });
});

describe('inspection and advanced operations (task 2.3)', () => {
    it('toString returns the scheme form and is repeatable', () => {
        // Constants fold at construction (kernel canonicalization), so a
        // non-foldable tree shows the printed operator form.
        const s = libfive.constant(1).add(libfive.x());
        try {
            expect(s.toString()).toBe('(+ 1 x)');
            expect(s.toString()).toBe(s.toString());
            const folded = libfive.constant(1).add(libfive.constant(2));
            try {
                expect(folded.toString()).toBe('3');
                expect(folded.getConst()).toBeCloseTo(3, 5);
            } finally {
                folded.free();
            }
        } finally {
            s.free();
        }
    });

    it('getConst distinguishes constants from expressions', () => {
        const c = libfive.constant(1.5);
        const x = libfive.x();
        try {
            expect(c.getConst()).toBeCloseTo(1.5, 5);
            expect(x.getConst()).toBeUndefined();
        } finally {
            c.free();
            x.free();
        }
    });

    it('remap composes coordinates', () => {
        const shifted = libfive.x().remap(libfive.x().add(1), libfive.y(), libfive.z());
        try {
            expect(shifted.evalF([3, 0, 0])).toBeCloseTo(4, 5);
        } finally {
            shifted.free();
        }
    });

    it('optimized returns a distinct usable shape; original untouched', () => {
        const sphere = makeSphere();
        try {
            const opt = sphere.optimized();
            try {
                expect(opt).not.toBe(sphere);
                expect(opt.tree).not.toBe(sphere.tree);
                expect(opt.evalF([0, 0, 0])).toBeCloseTo(-1, 5);
                expect(opt.evalF([2, 0, 0])).toBeCloseTo(1, 5);
                expect(sphere.evalF([0, 0, 0])).toBeCloseTo(-1, 5);
            } finally {
                opt.free();
            }
        } finally {
            sphere.free();
        }
    });

    it('fromTree adopts a raw-built tree, freed exactly once', () => {
        const ptr = libfive.raw._libfive_tree_x();
        const s = libfive.Shape.fromTree(ptr);
        try {
            expect(s.evalF([7, 0, 0])).toBeCloseTo(7, 5);
            s.free();
            expect(() => s.free()).not.toThrow();
            expect(() => s.evalF([0, 0, 0])).toThrow(/freed Shape/);
            expect(() => libfive.Shape.fromTree(0)).toThrow(/null tree handle/);
        } finally {
            s.free();
        }
    });

    it('the tree handle is read-only and gated on free', () => {
        const s = libfive.x();
        try {
            expect(typeof s.tree).toBe('number');
            s.free();
            expect(() => s.tree).toThrow(/freed Shape/);
        } finally {
            s.free();
        }
    });
});

describe('tree-level evaluation (task 2.4)', () => {
    it('evalF hits known sphere values', () => {
        const sphere = makeSphere();
        try {
            expect(sphere.evalF([0, 0, 0])).toBeCloseTo(-1, 5);
            expect(sphere.evalF([2, 0, 0])).toBeCloseTo(1, 5);
        } finally {
            sphere.free();
        }
    });

    it('evalR bounds contain densely sampled point values', () => {
        const sphere = makeSphere();
        try {
            const region: Region3 = {
                min: [-1, -1, -1],
                max: [1, 1, 1],
            };
            const bounds = sphere.evalR(region);
            for (let x = -1; x <= 1; x += 0.5) {
                for (let y = -1; y <= 1; y += 0.5) {
                    for (let z = -1; z <= 1; z += 0.5) {
                        const value = sphere.evalF([x, y, z]);
                        expect(value).toBeGreaterThanOrEqual(bounds.lower - 1e-5);
                        expect(value).toBeLessThanOrEqual(bounds.upper + 1e-5);
                    }
                }
            }
            // The interval must contain every sampled value, including
            // the extremes: the center (−1) and the region corners
            // (sqrt(3) − 1 ≈ 0.732 for the unit sphere).
            expect(bounds.lower).toBeLessThanOrEqual(-1 + 1e-5);
            expect(bounds.upper).toBeGreaterThanOrEqual(Math.sqrt(3) - 1 - 1e-5);
        } finally {
            sphere.free();
        }
    });

    it('evalD returns the gradient', () => {
        const x = libfive.x();
        try {
            expect(x.evalD([5, 3, 1])).toEqual([1, 0, 0]);
        } finally {
            x.free();
        }
    });

    it('non-constant Shape components cannot act as coordinates', () => {
        const x = libfive.x();
        try {
            expect(() => x.evalF([x as never, 0, 0])).toThrow(
                /evalF.*non-constant Shape components/,
            );
        } finally {
            x.free();
        }
    });
});

describe('use-after-free errors', () => {
    it('methods on a freed shape throw a named error', () => {
        const s = libfive.x();
        s.free();
        expect(() => s.add(1)).toThrow(/freed Shape/);
        expect(() => s.add(1)).toThrow(LibfiveError);
    });
});
