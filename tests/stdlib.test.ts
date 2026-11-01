/*
 * libfive-wasm tests: the generated stdlib surface against the real artifact
 * (stdlib-bindings task 2.4).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { LibfiveError } from '../src/errors.js';
import {
    STDLIB_ALIASES,
    STDLIB_METHOD_NAMES,
    STDLIB_SPECS,
} from '../src/gen/stdlib.js';
import { initFromFactory } from '../src/loader/index.js';
import { loadRealFactory } from './support/artifact.js';
import type { Libfive, Shape, Vec3Arg } from '../src/index.js';

let libfive: Libfive;

beforeAll(async () => {
    const factory = await loadRealFactory();
    libfive = await initFromFactory(factory, { debug: false });
});

const SAMPLES: Vec3Arg[] = [
    [0, 0, 0],
    [0.5, 0, 0],
    [0, 0.5, 0],
    [0, 0, 0.5],
    [1, 1, 1],
    [-0.75, 0.25, 0.5],
];

function expectSame(
    a: Shape,
    b: Shape,
    label: string,
    precision = 5,
): void {
    for (const point of SAMPLES) {
        expect(a.evalF(point), `${label} at ${JSON.stringify(point)}`).toBeCloseTo(
            b.evalF(point),
            precision,
        );
    }
}

describe('generated stdlib surface (task 2.4)', () => {
    it('exposes every generated function, alias and method exactly once', () => {
        const instance = libfive as unknown as Record<string, unknown>;
        for (const spec of STDLIB_SPECS) {
            expect(typeof instance[spec.jsName], spec.jsName).toBe('function');
        }
        for (const alias of STDLIB_ALIASES) {
            expect(typeof instance[alias.jsName], alias.jsName).toBe('function');
        }
        const proto = Object.getPrototypeOf(libfive.x()) as Record<
            string,
            unknown
        >;
        for (const name of STDLIB_METHOD_NAMES) {
            expect(typeof proto[name], name).toBe('function');
        }
        // Receiver-less declarations never become methods.
        expect(proto.sphere).toBeUndefined();
        expect(proto.text).toBeUndefined();
        // `raw` stays core-only (AD-011, AD-017).
        const raw = libfive.raw as unknown as Record<string, unknown>;
        expect(raw.sphere).toBeUndefined();
        expect(raw._sphere).toBeUndefined();
        expect(raw._shim_stdlib_sphere).toBeUndefined();
    });

    it('reaches one function from every section', () => {
        const shapes: Shape[] = [];
        try {
            const ball = libfive.sphere(1);
            shapes.push(ball);
            expect(ball.evalF([0, 0, 0])).toBeCloseTo(-1, 4);
            expect(ball.evalF([2, 0, 0])).toBeCloseTo(1, 4);

            const cube = libfive.box([-1, -1, -1], [1, 1, 1]);
            shapes.push(cube);
            expect(cube.evalF([0, 0, 0])).toBeLessThan(0);
            expect(cube.evalF([2, 0, 0])).toBeGreaterThan(0);

            const disc = libfive.circle(1);
            shapes.push(disc);
            expect(disc.evalF([0, 0, 0])).toBeLessThan(0);
            expect(disc.evalF([2, 0, 0])).toBeGreaterThan(0);

            const repeated = libfive.arrayX(libfive.circle(0.4), 3, 1);
            shapes.push(repeated);
            expect(Number.isFinite(repeated.evalF([0, 0, 0]))).toBe(true);
            expect(repeated.evalF([0, 0, 0])).toBeLessThan(0);
            expect(repeated.evalF([2, 0, 0])).toBeLessThan(0);

            const moved = libfive.move(ball, [2, 0, 0]);
            shapes.push(moved);
            expect(moved.evalF([2, 0, 0])).toBeCloseTo(-1, 4);

            const label = libfive.text('A', [0, 0]);
            shapes.push(label);
            expect(label.toString()).not.toBe(libfive.text('B').toString());

            const united = libfive.union(ball, libfive.sphere(1, [3, 0, 0]));
            shapes.push(united);
            expect(united.evalF([0, 0, 0])).toBeLessThan(0);
            expect(united.evalF([3, 0, 0])).toBeLessThan(0);
        } finally {
            for (const shape of shapes) {
                shape.free();
            }
        }
    });

    it('applies upstream defaults identically to explicit values', () => {
        const pairs: Array<[Shape, Shape, string]> = [];
        try {
            pairs.push([
                libfive.sphere(1),
                libfive.sphere(1, [0, 0, 0]),
                'sphere center',
            ]);
            pairs.push([
                libfive.boxCentered([1, 2, 3]),
                libfive.boxCentered([1, 2, 3], [0, 0, 0]),
                'boxCentered center',
            ]);
            const disc = libfive.circle(1);
            pairs.push([disc.reflectX(), disc.reflectX(0), 'reflectX x0']);
            pairs.push([
                disc.taperXY([0, 0], 1, 2),
                disc.taperXY([0, 0], 1, 2, 1),
                'taperXy baseScale',
            ]);
            for (const [a, b, label] of pairs) {
                expectSame(a, b, label);
            }
        } finally {
            for (const [a, b] of pairs) {
                a.free();
                b.free();
            }
        }
    });

    it('makes aliases behave exactly like their targets', () => {
        const pairs: Array<[Shape, Shape, string]> = [];
        try {
            pairs.push([
                libfive.box([0, 0, 0], [1, 2, 3]),
                libfive.boxMitered([0, 0, 0], [1, 2, 3]),
                'box',
            ]);
            pairs.push([
                libfive.cylinder(1, 2),
                libfive.cylinderZ(1, 2),
                'cylinder',
            ]);
            pairs.push([libfive.torus(2, 0.5), libfive.torusZ(2, 0.5), 'torus']);
            const disc = libfive.circle(0.5);
            pairs.push([
                disc.rotate(Math.PI / 3),
                disc.rotateZ(Math.PI / 3),
                'rotate',
            ]);
            pairs.push([
                libfive.arrayPolar(disc, 5),
                libfive.arrayPolarZ(disc, 5),
                'arrayPolar',
            ]);
            const a = libfive.sphere(1);
            const b = libfive.sphere(1, [1.5, 0, 0]);
            pairs.push([
                libfive.blend(a, b, 0.3),
                libfive.blendExptUnit(a, b, 0.3),
                'blend',
            ]);
            for (const [left, right, label] of pairs) {
                expectSame(left, right, label);
            }
        } finally {
            for (const [left, right] of pairs) {
                left.free();
                right.free();
            }
        }
    });

    it('makes method forms equivalent to the top-level call', () => {
        const shapes: Shape[] = [];
        try {
            const ball = libfive.sphere(1);
            shapes.push(ball);
            const pairs: Array<[Shape, Shape, string]> = [
                [ball.move([1, 2, 3]), libfive.move(ball, [1, 2, 3]), 'move'],
                [
                    ball.rotateZ(Math.PI / 4),
                    libfive.rotateZ(ball, Math.PI / 4),
                    'rotateZ',
                ],
                [
                    ball.scaleXYZ([2, 2, 2], [0, 1, 0]),
                    libfive.scaleXYZ(ball, [2, 2, 2], [0, 1, 0]),
                    'scaleXyz',
                ],
                [
                    ball.arrayX(3, 1),
                    libfive.arrayX(ball, 3, 1),
                    'arrayX',
                ],
            ];
            for (const [a, b, label] of pairs) {
                expectSame(a, b, label);
            }
            for (const [a, b] of pairs) {
                a.free();
                b.free();
            }
            // Receiver still usable after the method calls above.
            expect(ball.evalF([0, 0, 0])).toBeCloseTo(-1, 4);
        } finally {
            for (const shape of shapes) {
                shape.free();
            }
        }
    });

    it('result shapes outlive their operands', () => {
        const operand = libfive.sphere(1);
        const moved = operand.move([2, 0, 0]);
        operand.free();
        try {
            expect(moved.evalF([2, 0, 0])).toBeCloseTo(-1, 4);
        } finally {
            moved.free();
        }
        expect(() => moved.free()).not.toThrow();
        expect(() => operand.evalF([0, 0, 0])).toThrow(/freed Shape/);
    });

    it('releases coerced constants instead of growing the heap', () => {
        // Warm up so the allocator has its steady-state blocks.
        for (let i = 0; i < 20; i++) {
            libfive.sphere(1, [1, 2, 3]).free();
        }
        const baseline = libfive.raw.HEAPU8.buffer.byteLength;
        for (let i = 0; i < 1000; i++) {
            const shape = libfive.sphere(1, [1, 2, 3]);
            shape.evalF([0, 0, 0]);
            shape.free();
        }
        expect(libfive.raw.HEAPU8.buffer.byteLength).toBeLessThanOrEqual(
            baseline + 4096,
        );
    });

    it('renders text through the byte-oriented font', () => {
        const a = libfive.text('A');
        const b = libfive.text('B');
        const multiline = libfive.text('A\nB');
        const sameLine = libfive.text('AB');
        const degree = libfive.text('°');
        const question = libfive.text('?');
        try {
            expect(a.toString()).not.toBe(b.toString());
            expect(multiline.toString()).not.toBe(sameLine.toString());
            expect(degree.toString()).not.toBe(question.toString());
        } finally {
            for (const shape of [a, b, multiline, sameLine, degree, question]) {
                shape.free();
            }
        }
    });

    it('rejects misuse with named errors and no kernel work', () => {
        const callable = libfive as unknown as Record<
            string,
            (...args: unknown[]) => Shape
        >;
        expect(() => callable.sphere!('1')).toThrow(LibfiveError);
        expect(() => callable.sphere!('1')).toThrow(
            /sphere: argument 'radius' must be a number or Shape/,
        );
        expect(() => callable.box!([0, 0], [1, 1, 1])).toThrow(
            /box: argument 'a' must be a 3-component vector/,
        );
        expect(() => callable.polygon!(1, 6.5)).toThrow(
            /polygon: argument 'n' must be a finite 32-bit integer/,
        );
        expect(() => callable.text!(1)).toThrow(/text: argument 'txt'/);
        expect(() => callable.text!('☃')).toThrow(
            /text characters must be in U\+0000-U\+00FF/,
        );
        expect(() => callable.sphere!()).toThrow(
            /sphere: missing required argument 'radius'/,
        );
    });
});
