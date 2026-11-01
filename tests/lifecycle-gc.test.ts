/*
 * libfive-wasm tests: object-lifecycle behavior under GC pressure
 * (task 5.1) — the `FinalizationRegistry` safety net, debug leak
 * warnings, derived-object survival and kernel-string copying
 * (AD-005), run against the real artifact with `--expose-gc`.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initFromFactory } from '../src/loader/index.js';
import { loadRealFactory } from './support/artifact.js';
import type { Libfive, Shape } from '../src/index.js';

let libfive: Libfive;

beforeAll(async () => {
    const factory = await loadRealFactory();
    libfive = await initFromFactory(factory, { debug: false });
});

const gc = globalThis as { gc?: () => void };
const gcAvailable = typeof gc.gc === 'function';
if (!gcAvailable) {
    // Run `npx vitest run` with the configured --expose-gc to include
    // these tests; the suite skips with a note otherwise.
    console.warn(
        '[lifecycle-gc] global.gc() unavailable (--expose-gc not passed); ' +
            'GC-pressure tests are skipped',
    );
}
const itWithGc = gcAvailable ? it : it.skip;

/** Builds a small derived-shape cluster; the reference is dropped by the caller. */
function buildCluster(libfiveInstance: Libfive): Shape {
    const a = libfiveInstance.x();
    return a
        .square()
        .add(libfiveInstance.y().square())
        .mul(0.5)
        .sub(1);
}

/** Forces collection until no further finalization progress is observable. */
function collect(): void {
    if (!gcAvailable) {
        return;
    }
    for (let i = 0; i < 5; i++) {
        gc.gc!();
    }
}

describe('GC safety net (task 5.1)', () => {
    itWithGc(
        'dropped derived shapes are reclaimed: repeated cycles do not grow the heap stepwise',
        () => {
            // Cycle 1 may grow the heap (cold allocator); after collection,
            // an identical cycle must reuse the freed kernel memory instead
            // of growing it again.
            const heapBytes = (): number => libfive.raw.HEAPU8.buffer.byteLength;

            for (let i = 0; i < 2000; i++) {
                buildCluster(libfive);
            }
            collect();
            const afterCycle1 = heapBytes();

            for (let i = 0; i < 2000; i++) {
                buildCluster(libfive);
            }
            collect();
            const afterCycle2 = heapBytes();

            // Without the registry net, cycle 2 would add a fresh ~cycle
            // worth of kernel allocations on top of cycle 1's.
            expect(afterCycle2).toBeLessThanOrEqual(afterCycle1 * 1.1 + 65536);
        },
    );
});

describe('debug leak warnings (task 5.1)', () => {
    itWithGc(
        'a debug instance warns naming the released kind; the default instance is silent',
        async () => {
            const factory = await loadRealFactory();
            const debugInstance = await initFromFactory(factory, { debug: true });
            const debugWarn = vi
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            try {
                buildCluster(debugInstance);
                collect();
                // FinalizationRegistry callbacks are asynchronous; yield
                // and collect a few times until the warning arrives.
                for (let i = 0; i < 10 && debugWarn.mock.calls.length === 0; i++) {
                    await new Promise((resolve) => setTimeout(resolve, 20));
                    collect();
                }
                expect(debugWarn.mock.calls.length).toBeGreaterThan(0);
                expect(debugWarn.mock.calls.some((call) =>
                    String(call[0]).includes('Shape'),
                )).toBe(true);
            } finally {
                debugWarn.mockRestore();
            }

            // Same workload on the default instance: results identical,
            // no lifecycle warning.
            const defaultInstance = await initFromFactory(factory, { debug: false });
            const defaultWarn = vi
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            try {
                const shape = buildCluster(defaultInstance);
                const value = shape.evalF([0.5, 0.5, 0.5]);
                shape.free();
                buildCluster(defaultInstance);
                collect();
                await new Promise((resolve) => setTimeout(resolve, 20));
                collect();
                expect(defaultWarn).not.toHaveBeenCalled();
                // Results are identical between debug and default runs.
                const shape2 = buildCluster(debugInstance);
                try {
                    expect(shape2.evalF([0.5, 0.5, 0.5])).toBeCloseTo(value, 5);
                } finally {
                    shape2.free();
                }
            } finally {
                defaultWarn.mockRestore();
            }
        },
    );
});

describe('derived-object survival (task 5.1)', () => {
    it('a derived shape stays fully usable after its operand is freed', () => {
        // Derive the (curved, proven-meshable) unit sphere from a single
        // operand so the test exercises lifetime, not meshability of
        // planar geometry.
        const a = libfive.x();
        const b = a
            .square()
            .add(libfive.y().square())
            .add(libfive.z().square())
            .sqrt()
            .sub(1);
        const expected = b.evalF([0, 0, 0]);
        a.free();
        try {
            // Evaluate, mesh, and free after the operand is gone.
            expect(b.evalF([0, 0, 0])).toBeCloseTo(expected, 5);
            const mesh = b.mesh({
                region: {
                    min: [-1.25, -1.25, -1.25] as [number, number, number],
                    max: [1.25, 1.25, 1.25] as [number, number, number],
                },
                res: 16,
            });
            try {
                expect(mesh.triCount).toBeGreaterThan(0);
            } finally {
                mesh.free();
            }
            b.free();
            expect(() => b.free()).not.toThrow();
        } finally {
            b.free();
        }
    });
});

describe('kernel strings (task 5.1)', () => {
    itWithGc(
        'repeated toString neither leaks nor degrades',
        () => {
            const s = libfive.constant(1).add(libfive.x());
            try {
                const first = s.toString();
                expect(first).toBe('(+ 1 x)');
                collect();
                const heapAfterFirst = libfive.raw.HEAPU8.buffer.byteLength;
                for (let i = 0; i < 500; i++) {
                    expect(s.toString()).toBe(first);
                }
                collect();
                // The kernel strings are copied and released per call;
                // the wasm heap stays flat across the loop.
                expect(libfive.raw.HEAPU8.buffer.byteLength).toBeLessThanOrEqual(
                    heapAfterFirst + 4096,
                );
            } finally {
                s.free();
            }
        },
    );
});
