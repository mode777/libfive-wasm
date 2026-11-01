/*
 * libfive-wasm tests: ffi struct/string/memory helpers against the real
 * artifact.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { initFromFactory } from '../src/loader/index.js';
import { loadRealFactory } from './support/artifact.js';
import type { Libfive } from '../src/index.js';
import type { VoidPtr } from '../src/ffi/types.js';

let libfive: Libfive;

beforeAll(async () => {
    const factory = await loadRealFactory();
    libfive = await initFromFactory(factory, { debug: false });
});

describe('struct helpers', () => {
    it('region written via helpers drives shim_tree_eval_r', () => {
        const { raw } = libfive;
        const tree = raw._libfive_tree_const(2);
        try {
            const region = raw.allocRegion3();
            const interval = raw.allocIntervalOut();
            try {
                region.set(-1, 1, -1, 1, -1, 1);
                raw._shim_tree_eval_r(tree, region.ptr, interval.ptr);
                // A constant tree evaluates to its constant everywhere.
                const { lower, upper } = interval.read();
                expect(lower).toBeCloseTo(2, 5);
                expect(upper).toBeCloseTo(2, 5);
            } finally {
                region.free();
                interval.free();
            }
        } finally {
            raw._libfive_tree_delete(tree);
        }
    });

    it('vec3 out-parameter round-trips through the shim', () => {
        const { raw } = libfive;
        const vec = raw.allocVec3();
        try {
            vec.set(1.5, -2.25, 3.125);
            expect(vec.read()).toEqual([1.5, -2.25, 3.125]);
        } finally {
            vec.free();
        }
    });
});

describe('string helpers', () => {
    it('UTF-8 strings round-trip byte-exact', () => {
        const { raw } = libfive;
        const text = 'libfive ✓ multibyte σ';
        const ptr = raw.allocUtf8(text);
        try {
            expect(raw.readString(ptr)).toBe(text);
            // The NUL terminator sits after the encoded byte length (not
            // the JS character length — the string is multibyte).
            expect(raw.HEAPU8[ptr + raw.lengthBytesUTF8(text)]).toBe(0);
        } finally {
            raw._free(ptr);
        }
    });
});

describe('view helpers', () => {
    it('views reflect freshly written bytes', () => {
        const { raw } = libfive;
        const ptr = raw._malloc(12);
        try {
            const f32 = raw.f32View(ptr, 3);
            f32[0] = 0.5;
            f32[1] = -0.25;
            f32[2] = 8;
            const reread = raw.f32View(ptr, 3);
            expect([...reread]).toEqual([0.5, -0.25, 8]);

            raw.setValue((ptr + 8) as VoidPtr, 7, 'i32');
            const u32 = raw.u32View((ptr + 8) as VoidPtr, 1);
            expect(u32[0]).toBe(7);
        } finally {
            raw._free(ptr);
        }
    });
});
