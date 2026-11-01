/*
 * libfive-wasm tests: golden mesh verification and fault injection (AD-025).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Libfive } from '../src/index.js';
import {
    GOLDEN_SCENES,
    HASHED_COMPONENTS,
    captureEnabled,
    compareGolden,
    hashVerts,
    loadGoldenLibfive,
    meshScene,
    meshSceneVertices,
    readGolden,
    writeGolden,
} from './support/golden.js';

let libfive: Libfive;

beforeAll(async () => {
    libfive = await loadGoldenLibfive();
});

afterAll(() => {
    // `Libfive` instances own the wasm heap; dropping the reference is the
    // documented teardown (there is no instance-level free in v1).
    libfive = undefined as unknown as Libfive;
});

/** Moves a float32 one representable step toward +infinity. */
function nextUpFloat32(value: number): number {
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value, true);
    const bits = view.getUint32(0, true);
    // Positive floats (and +0) order upward with the bit pattern; negative
    // floats order downward, so decrementing the magnitude moves toward +inf.
    view.setUint32(0, value >= 0 ? bits + 1 : bits - 1, true);
    return view.getFloat32(0, true);
}

describe('golden meshes (AD-025)', () => {
    for (const scene of GOLDEN_SCENES) {
        it(`${scene.id} matches its checked-in golden`, async () => {
            const actual = await meshScene(libfive, scene);
            if (captureEnabled()) {
                writeGolden(scene, actual);
                console.warn(
                    `[golden] captured ${scene.id}: ${actual.vertCount} verts, ` +
                        `${actual.triCount} tris`,
                );
                return;
            }
            compareGolden(scene.id, actual, readGolden(scene.id));
        });
    }
});

describe('golden harness fault injection (AD-025)', () => {
    it('rejects a one-ulp vertex perturbation', async () => {
        const scene = GOLDEN_SCENES.find((candidate) => candidate.id === 'sphere');
        if (!scene) throw new Error('sphere golden scene is missing');

        const { actual, verts } = await meshSceneVertices(libfive, scene);
        const golden = readGolden(scene.id);
        // Guard against a false pass: the unperturbed mesh must match first.
        compareGolden(scene.id, actual, golden);

        const perturbed = verts.slice();
        if (perturbed.length === 0) throw new Error('sphere mesh has no vertices');
        perturbed[0] = nextUpFloat32(perturbed[0] as number);
        const hashedComponents = Math.min(perturbed.length, HASHED_COMPONENTS);
        const faulted = {
            ...actual,
            vertexHash: hashVerts(perturbed, hashedComponents),
        };

        expect(() => compareGolden(scene.id, faulted, golden)).toThrow(
            /golden mismatch for "sphere": vertexHash/,
        );
    });
});
