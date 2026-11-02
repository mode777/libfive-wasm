/*
 * libfive-wasm tests: validate the public showcase catalog (AD-028).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { init, type Libfive } from 'libfive-wasm';
import { coverageBySection, missingSections } from '../site/src/demos/coverage.js';
import { demos } from '../site/src/demos/index.js';
import { SECTIONS } from '../site/src/demos/sections.js';
import { MeshSession } from '../site/src/worker/run-demo.js';
import { WASM_PATH } from './support/artifact.js';

let libfive: Libfive;

beforeAll(async () => {
    libfive = await init({ wasmBinary: readFileSync(WASM_PATH) });
});

afterAll(() => {
    libfive = undefined as unknown as Libfive;
});

describe('showcase demo catalog', () => {
    it('has unique ids and non-empty metadata', () => {
        const ids = new Set<string>();
        for (const demo of demos) {
            expect(demo.meta.id).toMatch(/^[a-z0-9-]+$/);
            expect(ids.has(demo.meta.id)).toBe(false);
            ids.add(demo.meta.id);
            expect(demo.meta.title.length).toBeGreaterThan(0);
            expect(demo.meta.description.length).toBeGreaterThan(0);
            expect(demo.meta.features.length).toBeGreaterThan(0);
            expect(demo.meta.sections.length).toBeGreaterThan(0);
            for (const section of demo.meta.sections) {
                expect(SECTIONS).toContain(section);
            }
            expect(typeof demo.build).toBe('function');
        }
        expect(demos).toHaveLength(25);
    });

    it('covers every known section', () => {
        const coverage = coverageBySection();
        for (const section of SECTIONS) {
            expect(coverage[section].length).toBeGreaterThan(0);
        }
        expect(missingSections()).toEqual([]);
    });

    for (const demo of demos) {
        it(`${demo.meta.id} meshes to finite geometry`, () => {
            // Keep CI fast; the point is that every catalog entry builds and
            // meshes through the public API, not that it matches final quality.
            const res = Math.max(4, Math.min(8, demo.meta.res));
            const shape = demo.build(libfive);
            const mesh = shape.mesh({ region: demo.meta.region, res });
            try {
                expect(mesh.triCount).toBeGreaterThan(0);
                expect(mesh.vertCount).toBeGreaterThan(0);
                const verts = mesh.copyVerts();
                for (let i = 0; i < verts.length; i++) {
                    expect(Number.isFinite(verts[i])).toBe(true);
                }
            } finally {
                mesh.free();
                shape.free();
            }
        }, 60000);

        const probes = demo.meta.probes;
        if (probes) {
            it(`${demo.meta.id} signature probes agree with the built shape`, () => {
                const fmt = (p: readonly number[]): string =>
                    `(${p.join(', ')})`;
                const res = Math.max(4, Math.min(8, demo.meta.res));
                const shape = demo.build(libfive);
                const mesh = shape.mesh({ region: demo.meta.region, res });
                try {
                    // An empty mesh fails every inside probe (showcase-gallery).
                    expect(
                        mesh.triCount > 0,
                        `${demo.meta.id} meshes to zero triangles`,
                    ).toBe(true);
                    for (const p of probes.inside ?? []) {
                        const f = shape.evalF([...p]);
                        expect(
                            f < 0,
                            `${demo.meta.id} inside probe ${fmt(p)} evaluates outside the solid (f=${f})`,
                        ).toBe(true);
                    }
                    for (const p of probes.outside ?? []) {
                        const f = shape.evalF([...p]);
                        expect(
                            f >= 0,
                            `${demo.meta.id} outside probe ${fmt(p)} evaluates inside the solid (f=${f})`,
                        ).toBe(true);
                    }
                } finally {
                    mesh.free();
                    shape.free();
                }
            }, 60000);
        }
    }
});

describe('clock face dial quality', () => {
    it('meshes at its declared resolution with resolved detail', () => {
        const demo = demos.find((d) => d.meta.id === 'clock-face');
        expect(demo, 'clock-face demo missing from the catalog').toBeDefined();
        if (!demo) return;

        const shape = demo.build(libfive);
        const started = performance.now();
        const mesh = shape.mesh({
            region: demo.meta.region,
            res: demo.meta.res,
        });
        const durationMs = performance.now() - started;
        try {
            // The kernel is deterministic: the healthy dial converges at
            // res 30 (res 40 is byte-identical) to ~29.5k triangles. A
            // large drop means engraved detail (numerals, ticks) stopped
            // resolving; sliver fragmentation instead shows up as probe
            // failures and in the gallery thumbnail, so this floor is one
            // layer of three.
            expect(mesh.triCount).toBeGreaterThanOrEqual(23000);
            // Blow-up tripwire: healthy meshing takes well under a second;
            // an accidental 4x res bump would exceed this.
            expect(durationMs).toBeLessThan(30000);
            console.info(
                `clock-face @ res ${demo.meta.res}: ${mesh.triCount} triangles, ${mesh.vertCount} vertices, ${durationMs.toFixed(0)} ms`,
            );
        } finally {
            mesh.free();
            shape.free();
        }
    }, 60000);
});

describe('showcase mesh session', () => {
    it('keeps the current mesh for STL and replaces it on the next demo', () => {
        const empty = new MeshSession(libfive);
        expect(() => empty.probe([0, 0, 0])).toThrow('no shape');
        empty.release();

        const session = new MeshSession(libfive);
        try {
            const first = session.run('text-badge');
            expect(first.triCount).toBeGreaterThan(0);
            expect(first.verts.length).toBe(first.vertCount * 3);
            expect(first.tris.length).toBe(first.triCount * 3);

            const stl = session.stl();
            expect(stl.triCount).toBe(first.triCount);
            expect(stl.buffer.byteLength).toBe(84 + stl.triCount * 50);

            const second = session.run('blended-blob');
            expect(second.triCount).toBeGreaterThan(0);
            expect(session.stl().triCount).toBe(second.triCount);
            const probe = session.probe([0, 0, 0]);
            expect(Number.isFinite(probe.value)).toBe(true);
            for (const component of probe.gradient) {
                expect(Number.isFinite(component)).toBe(true);
            }
            expect(() => session.run('missing-demo')).toThrow('unknown demo');
        } finally {
            session.release();
        }
    }, 60000);
});
