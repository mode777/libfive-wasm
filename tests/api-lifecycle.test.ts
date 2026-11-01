/*
 * libfive-wasm tests: lifecycle token machinery (artifact-free units).
 *
 * Covers tasks 1.1/1.2: idempotent free, exactly-once release across the
 * explicit and registry paths, use-after-free gating, and the debug
 * leak warnings of AD-005.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it, vi } from 'vitest';
import { LibfiveError } from '../src/errors.js';
import {
    Lifecycle,
    releaseToken,
    type Token,
} from '../src/api/lifecycle.js';

const WRAPPER = {}; // registry target stand-in

function makeToken(
    overrides: Partial<Token> = {},
): Token {
    const deleter = vi.fn();
    const token: Token = {
        ptr: 1234,
        kind: 'Shape',
        deleter,
        alive: true,
        ...overrides,
    };
    return token;
}

describe('explicit free', () => {
    it('releases the kernel object exactly once', () => {
        const lifecycle = new Lifecycle(false);
        const token = makeToken();
        lifecycle.register(WRAPPER, token.kind, token.ptr, token.deleter);
        lifecycle.free(token);
        expect(token.deleter).toHaveBeenCalledTimes(1);
        expect(token.deleter).toHaveBeenCalledWith(1234);
        expect(token.alive).toBe(false);
    });

    it('is idempotent: a second free() is a no-op', () => {
        const lifecycle = new Lifecycle(false);
        const token = makeToken();
        lifecycle.register(WRAPPER, token.kind, token.ptr, token.deleter);
        lifecycle.free(token);
        lifecycle.free(token);
        expect(token.deleter).toHaveBeenCalledTimes(1);
    });

    it('unregisters the token so the registry path cannot double-release', () => {
        const lifecycle = new Lifecycle(false);
        const token = makeToken();
        lifecycle.register(WRAPPER, token.kind, token.ptr, token.deleter);
        lifecycle.free(token);
        // Simulate the registry firing for the freed token.
        lifecycle.collect(token);
        expect(token.deleter).toHaveBeenCalledTimes(1);
    });
});

describe('registry-driven release', () => {
    it('releases an alive token exactly once', () => {
        const lifecycle = new Lifecycle(false);
        const token = makeToken();
        lifecycle.register(WRAPPER, token.kind, token.ptr, token.deleter);
        lifecycle.collect(token);
        expect(token.deleter).toHaveBeenCalledTimes(1);
        expect(token.alive).toBe(false);
    });

    it('is silent by default', () => {
        const lifecycle = new Lifecycle(false);
        const token = makeToken();
        lifecycle.register(WRAPPER, token.kind, token.ptr, token.deleter);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            lifecycle.collect(token);
            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });

    it('warns naming the object kind on a debug instance', () => {
        const lifecycle = new Lifecycle(true);
        const meshToken = makeToken({ kind: 'Mesh' });
        lifecycle.register(WRAPPER, meshToken.kind, meshToken.ptr, meshToken.deleter);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            lifecycle.collect(meshToken);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0]?.[0]).toContain('Mesh');
        } finally {
            warn.mockRestore();
        }
    });
});

describe('releaseToken', () => {
    it('is a no-op on an already-released token', () => {
        const token = makeToken();
        releaseToken(token, false);
        releaseToken(token, false);
        expect(token.deleter).toHaveBeenCalledTimes(1);
    });
});

describe('use-after-free gate', () => {
    it('returns the pointer for an alive object', () => {
        const lifecycle = new Lifecycle(false);
        const token = makeToken();
        lifecycle.register(WRAPPER, token.kind, token.ptr, token.deleter);
        expect(lifecycle.requireAlive(token, 'add')).toBe(1234);
    });

    it('throws LibfiveError naming the kind and operation after free', () => {
        const lifecycle = new Lifecycle(false);
        const token = makeToken();
        lifecycle.register(WRAPPER, token.kind, token.ptr, token.deleter);
        lifecycle.free(token);
        expect(() => lifecycle.requireAlive(token, 'add')).toThrow(LibfiveError);
        try {
            lifecycle.requireAlive(token, 'add');
            expect.unreachable('requireAlive should have thrown');
        } catch (err) {
            expect((err as LibfiveError).message).toContain('Shape');
            expect((err as LibfiveError).message).toContain('add');
        }
    });
});
