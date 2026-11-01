/*
 * libfive-wasm: typed surface of the wasm artifact (raw namespace).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * The artifact is 32-bit wasm: every pointer crossing into JavaScript is an
 * unsigned 32-bit offset into the wasm heap (see wasm/README.md). Branded
 * aliases keep distinct handle kinds from mixing in TypeScript at zero
 * runtime cost.
 */
declare const brand: unique symbol;
type Branded<T extends number, B extends string> = T & {
    readonly [brand]: B;
};

/** `libfive_tree` handle. */
export type TreePtr = Branded<number, 'TreePtr'>;
/** `libfive_mesh*` handle. */
export type MeshPtr = Branded<number, 'MeshPtr'>;
/** `libfive_evaluator` handle. */
export type EvaluatorPtr = Branded<number, 'EvaluatorPtr'>;
/** `libfive_vars` handle. */
export type VarsPtr = Branded<number, 'VarsPtr'>;
/**
 * `char*` pointing at a kernel-owned string (freed via `_libfive_free_str`).
 * Pointer-compatible with `VoidPtr`, as in C.
 */
export type StrPtr = VoidPtr;
/** Untyped allocation from `_malloc`. */
export type VoidPtr = Branded<number, 'VoidPtr'>;

/** `getValue`/`setValue` type tags (the i64/BigInt path is not used). */
export type WasmValueType = 'i8' | 'i16' | 'i32' | 'float' | 'double';

/** A `libfive_region3` allocated in wasm memory, written via its shim. */
export interface Region3Ref {
    readonly ptr: VoidPtr;
    set(
        xLower: number,
        xUpper: number,
        yLower: number,
        yUpper: number,
        zLower: number,
        zUpper: number,
    ): void;
    free(): void;
}

/** A `libfive_vec3` allocated in wasm memory, written via its shim. */
export interface Vec3Ref {
    readonly ptr: VoidPtr;
    set(x: number, y: number, z: number): void;
    /** Reads the three floats back. */
    read(): [number, number, number];
    free(): void;
}

/** An 8-byte `libfive_interval` out-parameter. */
export interface IntervalRef {
    readonly ptr: VoidPtr;
    /** Reads `[lower, upper]` after a shim call wrote the interval. */
    read(): { lower: number; upper: number };
    free(): void;
}

/**
 * The raw C namespace (`libfive.raw`): the frozen core export manifest
 * (`wasm/exports.txt`, AD-022) plus allocator, heap views, string helpers
 * and the package's struct/memory utilities. Typed C stdlib wrappers are
 * NOT part of this surface (AD-017 lands them with stdlib-bindings).
 *
 * Naming follows the module's exported keys verbatim, including the
 * Emscripten leading underscore.
 */
export interface RawLibfive {
    // --- Tree construction and inspection (libfive.h) ---
    _libfive_tree_x(): TreePtr;
    _libfive_tree_y(): TreePtr;
    _libfive_tree_z(): TreePtr;
    _libfive_tree_var(): TreePtr;
    /** 1 when the tree is a free variable, 0 otherwise (int32-as-bool). */
    _libfive_tree_is_var(tree: TreePtr): number;
    _libfive_tree_const(value: number): TreePtr;
    _libfive_tree_nullary(opcode: number): TreePtr;
    _libfive_tree_unary(opcode: number, a: TreePtr): TreePtr;
    _libfive_tree_binary(opcode: number, a: TreePtr, b: TreePtr): TreePtr;
    _libfive_tree_id(tree: TreePtr): TreePtr;
    _libfive_tree_delete(tree: TreePtr): void;
    _libfive_tree_remap(
        tree: TreePtr,
        x: TreePtr,
        y: TreePtr,
        z: TreePtr,
    ): TreePtr;
    _libfive_tree_optimized(tree: TreePtr): TreePtr;
    /** Returns a kernel-owned C string; release with `_libfive_free_str`. */
    _libfive_tree_print(tree: TreePtr): StrPtr;
    _libfive_free_str(ptr: StrPtr): void;

    // --- Opcode lookup ---
    /** Negative result means unknown opcode name. */
    _libfive_opcode_enum(name: StrPtr): number;
    _libfive_opcode_args(opcode: number): number;
    /** Convenience over `_libfive_opcode_enum`: throws on unknown names. */
    opcodeByName(name: string): number;

    // --- Kernel object deleters ---
    _libfive_mesh_delete(mesh: MeshPtr): void;
    _libfive_evaluator_delete(evaluator: EvaluatorPtr): void;
    _libfive_vars_delete(vars: VarsPtr): void;

    // --- ABI shims (wasm/shim.h) ---
    _shim_region3_set(
        region: VoidPtr,
        xLower: number,
        xUpper: number,
        yLower: number,
        yUpper: number,
        zLower: number,
        zUpper: number,
    ): void;
    _shim_vec3_set(vec: VoidPtr, x: number, y: number, z: number): void;
    _shim_tree_eval_f(tree: TreePtr, point: VoidPtr): number;
    _shim_tree_eval_r(
        tree: TreePtr,
        region: VoidPtr,
        out: VoidPtr,
    ): void;
    _shim_tree_eval_d(tree: TreePtr, point: VoidPtr, out: VoidPtr): void;
    /** Writes 0/1 to `success` and returns the constant value. */
    _shim_tree_get_const(tree: TreePtr, success: VoidPtr): number;
    _shim_tree_render_mesh_st(
        tree: TreePtr,
        region: VoidPtr,
        res: number,
    ): MeshPtr;
    _shim_mesh_verts(mesh: MeshPtr): VoidPtr;
    _shim_mesh_tris(mesh: MeshPtr): VoidPtr;
    _shim_mesh_vert_count(mesh: MeshPtr): number;
    _shim_mesh_tri_count(mesh: MeshPtr): number;
    _shim_tree_evaluator(tree: TreePtr, vars: VoidPtr): EvaluatorPtr;
    /** 1 on success, 0 on failure (C bool flattened). */
    _shim_evaluator_update_vars(evaluator: EvaluatorPtr, vars: VoidPtr): number;

    // --- Allocator ---
    _malloc(size: number): VoidPtr;
    _free(ptr: VoidPtr): void;

    // --- Exported runtime helpers ---
    // The heap views are the memory accessors (wasm/README.md): the glue
    // reassigns them on growth, so their `.buffer` is always current. The
    // artifact does not export a `memory` property (frozen surface,
    // AD-022); each view's buffer is the live wasm memory buffer.
    readonly HEAP8: Int8Array;
    readonly HEAPU8: Uint8Array;
    readonly HEAP32: Int32Array;
    readonly HEAPU32: Uint32Array;
    readonly HEAPF32: Float32Array;
    UTF8ToString(ptr: VoidPtr, maxBytes?: number): string;
    stringToUTF8(text: string, out: VoidPtr, maxBytes: number): void;
    lengthBytesUTF8(text: string): number;
    getValue(ptr: VoidPtr, type: WasmValueType): number;
    setValue(ptr: VoidPtr, value: number, type: WasmValueType): void;

    // --- Memory utilities (package helpers over the primitives above) ---
    /** Copies a JS string into freshly allocated NUL-terminated UTF-8. */
    allocUtf8(text: string): VoidPtr;
    /** Reads a NUL-terminated UTF-8 C string (borrowed; does not free). */
    readString(ptr: VoidPtr): string;
    /**
     * Reads a kernel-owned string (as returned by `_libfive_tree_print`)
     * and releases it via `_libfive_free_str`.
     */
    readKernelString(ptr: StrPtr): string;
    /** Fresh views over the current wasm buffer (AD-006 semantics). */
    f32View(ptr: VoidPtr, length: number): Float32Array;
    u32View(ptr: VoidPtr, length: number): Uint32Array;
    u8View(ptr: VoidPtr, length: number): Uint8Array;
    allocRegion3(): Region3Ref;
    allocVec3(): Vec3Ref;
    allocIntervalOut(): IntervalRef;
    allocVec3Out(): Vec3Ref;
}

/**
 * The full Emscripten module behind `RawLibfive`. It carries additional
 * untyped internals (runtime plumbing, stdlib symbols appended at link
 * time); only the `RawLibfive` surface is the contract (AD-011).
 */
export type LibfiveModule = RawLibfive;
