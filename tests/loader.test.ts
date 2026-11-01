/*
 * libfive-wasm tests: loader option handling against stub factories.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibfiveError } from '../src/errors.js';
import { init, initFromFactory } from '../src/loader/index.js';
import { loadFactory } from '../src/loader/glue.js';
import type {
    InitOptions,
    LibfiveModuleArg,
    ModuleFactory,
} from '../src/loader/types.js';
import type { LibfiveModule } from '../src/ffi/types.js';
import { STDLIB_SPECS } from '../src/gen/stdlib.js';

// The public init() path is exercised with the glue seam mocked out.
vi.mock('../src/loader/glue.js', () => ({
    loadFactory: vi.fn(),
}));

const loadFactoryMock = vi.mocked(loadFactory);

/**
 * A minimal module stub: enough for createRaw's lazy assembly and the
 * eager method-table resolution (design D3) — runtime string helpers,
 * an opcode lookup that resolves any name, and every generated stdlib
 * shim under the artifact's underscore-prefixed module keys.
 */
function stubModule(): LibfiveModule {
    const buffer = new ArrayBuffer(1024);
    const HEAPU8 = new Uint8Array(buffer);
    const HEAPF32 = new Float32Array(buffer);
    const strings = new Map<number, string>();
    let nextPtr = 16;
    const module = {
        HEAPU8,
        HEAPF32,
        lengthBytesUTF8: (text: string) => new TextEncoder().encode(text).length,
        stringToUTF8: (text: string, out: number) => {
            strings.set(out, text);
        },
        UTF8ToString: (ptr: number) => strings.get(ptr) ?? '',
        _malloc: (size: number) => {
            const ptr = nextPtr;
            nextPtr += size;
            return ptr;
        },
        _free: () => {},
        // Resolves any name to a fixed opcode number (the api layer only
        // requires a non-negative result at construction time).
        _libfive_opcode_enum: (ptr: number) => (strings.has(ptr) ? 1 : -1),
        _libfive_opcode_args: () => 0,
        // Generated flat stdlib shims (AD-024): the runtime resolves every
        // one eagerly, so the stub must expose the full generated set.
        ...Object.fromEntries(
            STDLIB_SPECS.map((spec) => [`_${spec.shim}`, () => 0]),
        ),
    };
    return module as unknown as LibfiveModule;
}

/** Records the factory argument and resolves with a stub module. */
function recordingFactory(): ModuleFactory & {
    calls: Array<LibfiveModuleArg | undefined>;
    module: LibfiveModule;
} {
    const calls: Array<LibfiveModuleArg | undefined> = [];
    const module = stubModule();
    const factory = (async (arg?: LibfiveModuleArg) => {
        calls.push(arg);
        return module;
    }) as ModuleFactory & {
        calls: Array<LibfiveModuleArg | undefined>;
        module: LibfiveModule;
    };
    factory.calls = calls;
    factory.module = module;
    return factory;
}

beforeEach(() => {
    loadFactoryMock.mockReset();
});

describe('initFromFactory', () => {
    it('forwards no resolution override by default', async () => {
        const factory = recordingFactory();
        const instance = await initFromFactory(factory);
        expect(factory.calls).toHaveLength(1);
        expect(factory.calls[0]).toEqual({});
        expect(instance.debug).toBe(false);
    });

    it('passes wasmBinary through and it beats locateWasm', async () => {
        const factory = recordingFactory();
        const bytes = new Uint8Array([1, 2, 3]);
        await initFromFactory(factory, {
            wasmBinary: bytes,
            locateWasm: () => 'file:///elsewhere/libfive.wasm',
        });
        expect(factory.calls[0]?.wasmBinary).toBe(bytes);
        expect(factory.calls[0]?.locateFile).toBeUndefined();
    });

    it('maps locateWasm to the factory locateFile seam', async () => {
        const factory = recordingFactory();
        const target = new URL('file:///assets/libfive.wasm');
        await initFromFactory(factory, { locateWasm: () => target });
        const locateFile = factory.calls[0]?.locateFile;
        expect(locateFile).toBeTypeOf('function');
        expect(locateFile?.('libfive.wasm', '/prefix/')).toBe(target.href);
    });

    it('records the debug flag on the instance', async () => {
        const factory = recordingFactory();
        const instance = await initFromFactory(factory, { debug: true });
        expect(instance.debug).toBe(true);
        expect(instance.raw).toBeTypeOf('object');
    });

    it('exposes the raw namespace with the memory utilities', async () => {
        const factory = recordingFactory();
        const { raw } = await initFromFactory(factory);
        expect(raw.allocUtf8).toBeTypeOf('function');
        expect(raw.readString).toBeTypeOf('function');
        expect(raw.allocRegion3).toBeTypeOf('function');
        expect(raw.f32View).toBeTypeOf('function');
        // The heap views are live getters through to the module's views.
        expect(raw.HEAPU8).toBe(factory.module.HEAPU8);
    });

    it.each([
        ['wasmBinary', { wasmBinary: 42 }],
        ['locateWasm', { locateWasm: 'nope' }],
        ['debug', { debug: 'yes' }],
    ] as const)('rejects wrong-typed option %s with LibfiveError', async (_name, options) => {
        const factory = recordingFactory();
        await expect(
            initFromFactory(factory, options as unknown as InitOptions),
        ).rejects.toThrow(LibfiveError);
        expect(factory.calls).toHaveLength(0);
    });

    it('wraps factory rejection in LibfiveError with the cause preserved', async () => {
        const boom = new Error('compile failed');
        const factory = (async () => {
            throw boom;
        }) as ModuleFactory;
        const promise = initFromFactory(factory, {
            wasmBinary: new Uint8Array([0]),
        });
        await expect(promise).rejects.toBeInstanceOf(LibfiveError);
        await expect(promise).rejects.toMatchObject({ cause: boom });
    });
});

describe('init', () => {
    it('resolves through the glue seam and returns the instance', async () => {
        const factory = recordingFactory();
        loadFactoryMock.mockResolvedValue(factory);
        const instance = await init({ debug: true });
        expect(instance.debug).toBe(true);
        expect(factory.calls).toHaveLength(1);
    });

    it('rejects with LibfiveError when the glue cannot be loaded', async () => {
        loadFactoryMock.mockRejectedValue(
            new LibfiveError('could not load the libfive module glue'),
        );
        await expect(init()).rejects.toBeInstanceOf(LibfiveError);
    });

    it('validates options before touching the glue seam', async () => {
        await expect(init({ debug: 'sure' as unknown as boolean })).rejects.toThrow(
            LibfiveError,
        );
        expect(loadFactoryMock).not.toHaveBeenCalled();
    });
});
