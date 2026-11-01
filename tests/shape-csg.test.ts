/*
 * libfive-wasm tests: the Shape CSG methods over the stdlib csg section
 * against the real artifact (task 3.1).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { initFromFactory } from '../src/loader/index.js';
import { CSG_TABLE } from '../src/api/context.js';
import { loadRealFactory, loadRealModule } from './support/artifact.js';
import type { Libfive, Shape } from '../src/index.js';

let libfive: Libfive;

beforeAll(async () => {
    const factory = await loadRealFactory();
    libfive = await initFromFactory(factory, { debug: false });
});

/** Unit sphere at the origin. */
function sphere(cx = 0, cy = 0, cz = 0): Shape {
    return libfive
        .x()
        .sub(cx)
        .square()
        .add(libfive.y().sub(cy).square())
        .add(libfive.z().sub(cz).square())
        .sqrt()
        .sub(1);
}

/** Axis-aligned box from (x0,y0,z0) to (x1,y1,z1) — max over axes of the
 * signed distances to the two bounds (negative inside). */
function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Shape {
    const bx = libfive.constant(x0).sub(libfive.x()).max(libfive.x().sub(libfive.constant(x1)));
    const by = libfive.constant(y0).sub(libfive.y()).max(libfive.y().sub(libfive.constant(y1)));
    const bz = libfive.constant(z0).sub(libfive.z()).max(libfive.z().sub(libfive.constant(z1)));
    return bx.max(by).max(bz);
}

describe('CSG method table (task 3.1)', () => {
    it('the CSG surface matches api-design.md', () => {
        const proto = Object.getPrototypeOf(libfive.x()) as Record<string, unknown>;
        for (const spec of CSG_TABLE) {
            expect(proto[spec.method], `missing method ${spec.method}`).toBeTypeOf('function');
        }
        // No loftBetween until the stdlib pointer shims (stdlib-bindings).
        expect(proto.loftBetween).toBeUndefined();
    });

    it('the glue-key mapping is pinned (C `_union` → module `__union`)', async () => {
        // The curated raw namespace carries no stdlib symbols (AD-017);
        // the keys live on the module context with a prepended underscore
        // (AD-022), so C `_union` is module key `__union`.
        const module = (await loadRealModule()) as unknown as Record<string, unknown>;
        expect(typeof module.__union).toBe('function');
        expect(typeof module._intersection).toBe('function');
        expect(typeof module._blend_expt_unit).toBe('function');
        expect(typeof module._blend_difference).toBe('function');
        // ...and the curated raw surface really does exclude them.
        expect((libfive.raw as unknown as Record<string, unknown>).__union).toBeUndefined();
    });

    it('sphere difference box evaluates correctly at discriminating points', () => {
        const shape = sphere().difference(box(-3, -0.5, -0.5, 3, 0.5, 0.5));
        try {
            // CSG via min/max is exact set logic, not exact distance:
            // difference(a, b) = max(a, −b). Assert exactly that.
            const aVal = sphere().evalF([0, 0.8, 0]);
            const bVal = box(-3, -0.5, -0.5, 3, 0.5, 0.5).evalF([0, 0.8, 0]);
            expect(shape.evalF([0, 0.8, 0])).toBeCloseTo(
                Math.max(aVal, -bVal), 4);
            // Inside both: subtracted (positive).
            expect(shape.evalF([0, 0, 0])).toBeGreaterThan(0);
            // Just outside the sphere along x stays outside.
            expect(shape.evalF([1.1, 0, 0])).toBeGreaterThan(0);
        } finally {
            shape.free();
        }
    });

    it('every CSG method returns an evaluable shape and leaves operands usable', () => {
        const a = sphere(-2, 0, 0);
        const b = sphere(2, 0, 0);
        try {
            const aVal = a.evalF([-3, 0, 0]);
            const bVal = b.evalF([3, 0, 0]);
            const proto = Object.getPrototypeOf(a) as Record<string, (...args: unknown[]) => Shape>;
            const cases: Array<[string, unknown[]]> = [
                ['union', [b]],
                ['intersect', [b]],
                ['difference', [b]],
                ['inverse', []],
                ['offset', [0.1]],
                ['clearance', [b, 0.1]],
                ['shell', [0.1]],
                ['blend', [b, 0.3]],
                ['blendExpt', [b, 0.3]],
                ['blendExptUnit', [b, 0.3]],
                ['blendRough', [b, 0.3]],
                ['blendDifference', [b, 0.4]],
                ['blendDifference', [b, 0.4, 0.1]],
                ['morph', [b, 0.5]],
                ['loft', [b, -1, 1]],
            ];
            for (const [method, args] of cases) {
                const out = proto[method]!.apply(a, args);
                expect(out, `${method} returned nothing`).toBeInstanceOf(Object);
                // Evaluable: a finite number comes back at some point.
                const value = out.evalF([0, 0, 0]);
                expect(Number.isFinite(value), `${method} evaluated non-finite`).toBe(true);
                out.free();
            }
            // Operands untouched.
            expect(a.evalF([-3, 0, 0])).toBeCloseTo(aVal, 5);
            expect(b.evalF([3, 0, 0])).toBeCloseTo(bVal, 5);
        } finally {
            a.free();
            b.free();
        }
    });

    it('blend variants produce interval bounds containing sampled evaluations', () => {
        const a = sphere(-0.5, 0, 0);
        const b = sphere(0.5, 0, 0);
        try {
            const variants: Array<[Shape, string]> = [
                [a.blend(b, 0.3), 'blend'],
                [a.blendExpt(b, 0.3), 'blendExpt'],
                [a.blendExptUnit(b, 0.3), 'blendExptUnit'],
                [a.blendRough(b, 0.3), 'blendRough'],
                [a.blendDifference(b, 0.4), 'blendDifference'],
            ];
            for (const [shape, name] of variants) {
                try {
                    const region = {
                        min: [-2, -2, -2] as [number, number, number],
                        max: [2, 2, 2] as [number, number, number],
                    };
                    const bounds = shape.evalR(region);
                    for (let x = -1.5; x <= 1.5; x += 0.5) {
                        const value = shape.evalF([x, 0, 0]);
                        expect(value, `${name} at x=${x}`).toBeGreaterThanOrEqual(bounds.lower - 1e-4);
                        expect(value, `${name} at x=${x}`).toBeLessThanOrEqual(bounds.upper + 1e-4);
                    }
                } finally {
                    shape.free();
                }
            }
        } finally {
            a.free();
            b.free();
        }
    });

    it('blendDifference applies the optional offset', () => {
        const a = sphere();
        const b = sphere(0, 0, 3); // disjoint from a
        try {
            // With offset 0 the disjoint subtraction leaves `a` unchanged;
            // with a large offset the expanded b bites into it.
            const noOffset = a.blendDifference(b, 0.5);
            const withOffset = a.blendDifference(b, 0.5, 2.0);
            try {
                expect(noOffset.evalF([0, 0, 0])).toBeLessThan(0);
                expect(withOffset.evalF([0, 0, 2.5])).toBeGreaterThan(
                    noOffset.evalF([0, 0, 2.5]));
            } finally {
                noOffset.free();
                withOffset.free();
            }
        } finally {
            a.free();
            b.free();
        }
    });

    it('CSG operands stay usable and freeable once after use', () => {
        const a = sphere();
        const b = box(-3, -0.25, -0.25, 3, 0.25, 0.25);
        try {
            const out = a.union(b);
            try {
                expect(out.evalF([0, 0, 0])).toBeLessThan(0);
            } finally {
                out.free();
            }
            // Operands still evaluate and free cleanly.
            expect(a.evalF([0, 0.9, 0])).toBeLessThan(0);
            a.free();
            b.free();
            expect(() => a.free()).not.toThrow();
            expect(() => b.free()).not.toThrow();
        } finally {
            a.free();
            b.free();
        }
    });
});
