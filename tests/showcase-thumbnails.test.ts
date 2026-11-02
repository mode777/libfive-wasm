/*
 * libfive-wasm tests: gallery thumbnail coverage and drift (AD-028,
 * showcase-thumbnails).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { demos } from '../site/src/demos/index.js';
import { REPO_ROOT } from './support/artifact.js';

interface PreviewEntry {
    readonly file: string;
    readonly sourceHash: string;
    readonly width: number;
    readonly height: number;
}

interface PreviewManifest {
    readonly previewVersion: number;
    readonly capturedAt: string;
    readonly viewport: {
        readonly width: number;
        readonly height: number;
        readonly deviceScaleFactor: number;
    };
    readonly quality: number;
    readonly demos: Record<string, PreviewEntry>;
}

const PREVIEW_DIR = path.join(REPO_ROOT, 'site', 'src', 'assets', 'previews');
const MANIFEST_PATH = path.join(PREVIEW_DIR, 'manifest.json');
const DEMO_SOURCE_DIR = path.join(REPO_ROOT, 'site', 'src', 'demos');

function readManifest(): PreviewManifest {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as PreviewManifest;
}

function sourceHash(id: string): string {
    const file = path.join(DEMO_SOURCE_DIR, `${id}.ts`);
    expect(existsSync(file), `demo source is missing: ${file}`).toBe(true);
    return createHash('sha256').update(readFileSync(file)).digest('hex');
}

describe('showcase thumbnails', () => {
    it('has a checked-in manifest with the expected capture settings', () => {
        expect(existsSync(MANIFEST_PATH), 'thumbnail manifest is missing').toBe(
            true,
        );
        const manifest = readManifest();
        expect(manifest.previewVersion).toBeGreaterThan(0);
        expect(manifest.viewport).toEqual({
            width: 640,
            height: 400,
            deviceScaleFactor: 2,
        });
        expect(manifest.quality).toBeGreaterThan(0);
    });

    it('covers every demo with a non-empty WebP image', () => {
        const manifest = readManifest();
        const ids = new Set(demos.map((demo) => demo.meta.id));

        for (const demo of demos) {
            const id = demo.meta.id;
            const entry = manifest.demos[id];
            expect(entry, `thumbnail manifest entry missing for ${id}`).toBeDefined();
            if (!entry) continue;

            expect(entry.file).toBe(`${id}.webp`);
            expect(entry.width).toBe(1280);
            expect(entry.height).toBe(800);

            const file = path.join(PREVIEW_DIR, entry.file);
            expect(existsSync(file), `thumbnail file missing for ${id}`).toBe(
                true,
            );
            expect(statSync(file).size).toBeGreaterThan(0);

            const header = readFileSync(file).subarray(0, 12);
            expect(header.subarray(0, 4).toString()).toBe('RIFF');
            expect(header.subarray(8, 12).toString()).toBe('WEBP');

            expect(entry.sourceHash, `stale thumbnail for ${id}`).toBe(
                sourceHash(id),
            );
        }

        const entries = Object.keys(manifest.demos);
        expect(new Set(entries)).toEqual(ids);
    });

    it('has no orphan preview images', () => {
        const manifest = readManifest();
        const expected = new Set(
            Object.values(manifest.demos).map((entry) => entry.file),
        );
        const actual = new Set(
            readdirSync(PREVIEW_DIR).filter((file) => file.endsWith('.webp')),
        );
        expect(actual).toEqual(expected);
    });
});
