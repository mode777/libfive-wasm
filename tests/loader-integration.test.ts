/*
 * libfive-wasm tests: loader integration against the real artifact —
 * instance isolation, factory default resolution, and failure modes.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LibfiveError } from '../src/errors.js';
import { initFromFactory } from '../src/loader/index.js';
import { loadRealFactory } from './support/artifact.js';
import { WASM_PATH } from './support/artifact.js';
import type { Libfive } from '../src/index.js';

describe('instance isolation', () => {
    it('two instances have distinct heaps and isolated allocations', async () => {
        const factory = await loadRealFactory();
        const a: Libfive = await initFromFactory(factory);
        const b: Libfive = await initFromFactory(factory);

        // Distinct live wasm buffers (memory is not an exported property;
        // the heap views' buffer is the live wasm memory, see design D3).
        expect(a.raw.HEAPU8.buffer).not.toBe(b.raw.HEAPU8.buffer);

        // Allocations and frees through one instance are not observable
        // through the other: park a pattern in b, churn allocations in a,
        // and verify b's bytes are untouched.
        const ptrB = b.raw._malloc(16);
        try {
            const pattern = [0x12, 0x34, 0x56, 0x78];
            const viewB = b.raw.u8View(ptrB, 4);
            viewB.set(pattern);

            for (let i = 0; i < 8; i++) {
                const ptrA = a.raw._malloc(64);
                a.raw.u8View(ptrA, 8).fill(0xab);
                a.raw._free(ptrA);
            }

            expect([...b.raw.u8View(ptrB, 4)]).toEqual(pattern);
        } finally {
            b.raw._free(ptrB);
        }
    });
});

describe('factory default resolution', () => {
    it('the real glue instantiates from its sibling wasm with no options', async () => {
        const factory = await loadRealFactory();
        // No wasmBinary, no locateFile: the glue's import.meta.url lookup
        // must find dist/libfive.wasm beside dist/libfive.js.
        const module = await factory();
        expect(typeof module._libfive_tree_x).toBe('function');
        const tree = module._libfive_tree_const(1);
        expect(tree).not.toBe(0);
        module._libfive_tree_delete(tree);
    });
});

describe('failure modes', () => {
    it('invalid wasmBinary rejects with LibfiveError', async () => {
        const factory = await loadRealFactory();
        const garbage = new Uint8Array([1, 2, 3, 4]);
        await expect(
            initFromFactory(factory, { wasmBinary: garbage }),
        ).rejects.toBeInstanceOf(LibfiveError);
    });

    it('the artifact bytes load through the documented path', async () => {
        // Sanity for the support loader itself: the artifact on disk is
        // the same one build-wasm.sh prints the SHA-256 of.
        const bytes = readFileSync(WASM_PATH);
        expect(bytes.length).toBeGreaterThan(1_000_000);
        expect(bytes[0]).toBe(0x00); // \0asm magic
        expect(bytes[1]).toBe(0x61);
        expect(bytes[2]).toBe(0x73);
        expect(bytes[3]).toBe(0x6d);
    });
});
