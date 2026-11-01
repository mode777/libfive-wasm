/*
 * libfive-wasm tests: raw namespace surface contract.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initFromFactory } from '../src/loader/index.js';
import { GLUE_PATH, loadRealFactory } from './support/artifact.js';
import { CORE_EXPORT_KEYS } from '../src/ffi/raw.js';
import type { Libfive } from '../src/index.js';

let libfive: Libfive;

beforeAll(async () => {
    const factory = await loadRealFactory();
    libfive = await initFromFactory(factory, { debug: false });
});

/** Core manifest symbols from wasm/exports.txt (comments stripped). */
function manifestSymbols(): string[] {
    const manifestPath = path.join(
        path.dirname(GLUE_PATH),
        '..',
        'wasm',
        'exports.txt',
    );
    return readFileSync(manifestPath, 'utf8')
        .split('\n')
        .map((line) => line.replace(/#.*/, '').trim())
        .filter(Boolean);
}

describe('raw namespace parity', () => {
    it('exposes every core manifest symbol as a callable function', () => {
        const { raw } = libfive;
        const symbols = manifestSymbols();
        expect(symbols.length).toBeGreaterThan(30);
        for (const symbol of symbols) {
            const surface = raw as unknown as Record<string, unknown>;
            expect(raw, symbol).toHaveProperty(symbol);
            expect(typeof surface[symbol], symbol).toBe('function');
        }
    });

    it('matches the curated key list against the manifest', () => {
        // If this fails, src/ffi/raw.ts and wasm/exports.txt have drifted;
        // both must change together (AD-022: editing the manifest is an ABI
        // change reviewed as one).
        const symbols = manifestSymbols();
        expect([...CORE_EXPORT_KEYS].sort()).toEqual([...symbols].sort());
    });

    it('exposes the runtime helpers as live getters', () => {
        const { raw } = libfive;
        expect(raw.HEAPU8).toBeInstanceOf(Uint8Array);
        expect(raw.HEAPF32).toBeInstanceOf(Float32Array);
        expect(raw.UTF8ToString).toBeTypeOf('function');
        expect(raw.stringToUTF8).toBeTypeOf('function');
        expect(raw.lengthBytesUTF8).toBeTypeOf('function');
        expect(raw.getValue).toBeTypeOf('function');
        expect(raw.setValue).toBeTypeOf('function');
    });
});

describe('raw namespace scope', () => {
    it('does not include generated stdlib wrappers (AD-017)', () => {
        const { raw } = libfive;
        // The artifact exports C stdlib symbols at link time, but the
        // typed raw surface is core-only until stdlib-bindings lands.
        for (const stdlib of [
            '_emptiness',
            '_sphere',
            '_box_mitered',
            '__union',
        ]) {
            expect(raw).not.toHaveProperty(stdlib);
        }
    });
});
