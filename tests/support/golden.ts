/*
 * libfive-wasm tests: checked-in golden mesh support (AD-025).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { initFromFactory } from '../../src/loader/index.js';
import type { Libfive, Mesh, Region3, Shape } from '../../src/index.js';
import { REPO_ROOT, loadRealFactory } from './artifact.js';

/** Number of float32 vertex components covered by the golden hash. */
export const HASHED_COMPONENTS = 6144;

const GOLDEN_DIR = path.join(REPO_ROOT, 'tests', 'goldens');
const LOCK_PATH = path.join(REPO_ROOT, 'vendor', 'libfive.lock');

export interface GoldenScene {
    readonly id: string;
    readonly region: Region3;
    readonly res: number;
    readonly build: (libfive: Libfive) => Shape;
}

export interface GoldenFile {
    readonly schemaVersion: 1;
    readonly scene: string;
    readonly region: Region3;
    readonly res: number;
    readonly vertCount: number;
    readonly triCount: number;
    readonly hashedComponents: number;
    readonly vertexHash: string;
    readonly vendorCommit: string;
}

/** The reviewed canonical scenes, in stable order. */
export const GOLDEN_SCENES: readonly GoldenScene[] = [
    {
        id: 'sphere',
        region: {
            min: [-1.5, -1.5, -1.5],
            max: [1.5, 1.5, 1.5],
        },
        res: 12,
        build: (libfive) => libfive.sphere(1),
    },
    {
        id: 'gyroid',
        region: {
            min: [-2, -2, -2],
            max: [2, 2, 2],
        },
        res: 8,
        build: (libfive) =>
            libfive.gyroid([2 * Math.PI, 2 * Math.PI, 2 * Math.PI], 0.4),
    },
    {
        id: 'blended-union',
        region: {
            min: [-2.5, -2.5, -2.5],
            max: [2.5, 2.5, 2.5],
        },
        res: 10,
        build: (libfive) => {
            const a = libfive.sphere(1, [-0.45, 0, 0]);
            const b = libfive.sphere(0.8, [0.55, 0, 0]);
            try {
                return a.blend(b, 0.4);
            } finally {
                a.free();
                b.free();
            }
        },
    },
    {
        id: 'text',
        region: {
            min: [-1.5, -1.5, -1.5],
            max: [1.5, 1.5, 1.5],
        },
        res: 10,
        build: (libfive) => libfive.text('lf', [-0.8, -0.5]),
    },
];

export function goldenPath(sceneId: string): string {
    return path.join(GOLDEN_DIR, `${sceneId}.json`);
}

/** Reads the pinned upstream commit recorded in `vendor/libfive.lock`. */
export function vendorCommit(): string {
    const text = readFileSync(LOCK_PATH, 'utf8');
    for (const line of text.split('\n')) {
        const match = /^commit=([0-9a-f]{40})$/.exec(line.trim());
        if (match?.[1]) return match[1];
    }
    throw new Error(`vendor/libfive.lock has no pinned commit: ${LOCK_PATH}`);
}

/** SHA-256 over the little-endian float32 components in `verts[0..count)`. */
export function hashVerts(verts: Float32Array, components: number): string {
    const count = Math.min(components, verts.length);
    const bytes = Buffer.from(
        verts.buffer,
        verts.byteOffset,
        count * Float32Array.BYTES_PER_ELEMENT,
    );
    return createHash('sha256').update(bytes).digest('hex');
}

export interface GoldenActual {
    readonly vertCount: number;
    readonly triCount: number;
    readonly hashedComponents: number;
    readonly vertexHash: string;
}

/** Meshes one scene and returns a JS-owned vertex copy plus the golden fields. */
export async function meshSceneVertices(
    libfive: Libfive,
    scene: GoldenScene,
): Promise<{ actual: GoldenActual; verts: Float32Array }> {
    const shape = scene.build(libfive);
    let mesh: Mesh | undefined;
    try {
        mesh = shape.mesh({ region: scene.region, res: scene.res });
        const verts = mesh.copyVerts();
        const hashedComponents = Math.min(verts.length, HASHED_COMPONENTS);
        return {
            actual: {
                vertCount: mesh.vertCount,
                triCount: mesh.triCount,
                hashedComponents,
                vertexHash: hashVerts(verts, hashedComponents),
            },
            verts,
        };
    } finally {
        mesh?.free();
        shape.free();
    }
}

/** Meshes one scene through the public API and releases every wrapper. */
export async function meshScene(
    libfive: Libfive,
    scene: GoldenScene,
): Promise<GoldenActual> {
    return (await meshSceneVertices(libfive, scene)).actual;
}

/** Compares a meshed result to a golden entry; throws a named mismatch. */
export function compareGolden(
    sceneId: string,
    actual: GoldenActual,
    golden: GoldenFile,
): void {
    const fail = (field: string, got: unknown, want: unknown): never => {
        throw new Error(
            `golden mismatch for "${sceneId}": ${field} is ${String(got)}, ` +
                `golden records ${String(want)}`,
        );
    };
    if (actual.vertCount !== golden.vertCount) {
        fail('vertCount', actual.vertCount, golden.vertCount);
    }
    if (actual.triCount !== golden.triCount) {
        fail('triCount', actual.triCount, golden.triCount);
    }
    if (actual.hashedComponents !== golden.hashedComponents) {
        fail('hashedComponents', actual.hashedComponents, golden.hashedComponents);
    }
    if (actual.vertexHash !== golden.vertexHash) {
        fail('vertexHash', actual.vertexHash, golden.vertexHash);
    }
}

/** Parses a checked-in golden, naming every missing or malformed field. */
export function readGolden(sceneId: string): GoldenFile {
    const file = goldenPath(sceneId);
    if (!existsSync(file)) {
        throw new Error(
            `missing golden ${file}; run \`npm run golden:capture\` ` +
                'against a reviewed release artifact',
        );
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
        throw new Error(`malformed golden ${file}: ${String(err)}`);
    }
    if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(`malformed golden ${file}: expected a JSON object`);
    }
    const golden = parsed as Partial<GoldenFile>;
    if (golden.schemaVersion !== 1) {
        throw new Error(`malformed golden ${file}: schemaVersion must be 1`);
    }
    if (golden.scene !== sceneId) {
        throw new Error(
            `malformed golden ${file}: scene is ${String(golden.scene)}`,
        );
    }
    if (
        typeof golden.vertCount !== 'number' ||
        typeof golden.triCount !== 'number' ||
        typeof golden.hashedComponents !== 'number' ||
        typeof golden.vertexHash !== 'string' ||
        typeof golden.res !== 'number' ||
        typeof golden.vendorCommit !== 'string' ||
        typeof golden.region !== 'object' ||
        golden.region === null
    ) {
        throw new Error(`malformed golden ${file}: missing required fields`);
    }
    return golden as GoldenFile;
}

/** Writes a golden atomically (capture mode only). */
export function writeGolden(scene: GoldenScene, actual: GoldenActual): void {
    const golden: GoldenFile = {
        schemaVersion: 1,
        scene: scene.id,
        region: scene.region,
        res: scene.res,
        ...actual,
        vendorCommit: vendorCommit(),
    };
    mkdirSync(GOLDEN_DIR, { recursive: true });
    const file = goldenPath(scene.id);
    const temp = `${file}.tmp`;
    writeFileSync(temp, `${JSON.stringify(golden, null, 2)}\n`);
    renameSync(temp, file);
}

/** True when the explicit capture switch is set. */
export function captureEnabled(): boolean {
    return process.env.GOLDEN_CAPTURE === '1';
}

/** Loads the package exactly like the other artifact-backed tests. */
export async function loadGoldenLibfive(): Promise<Libfive> {
    const factory = await loadRealFactory();
    return initFromFactory(factory, { debug: false });
}
