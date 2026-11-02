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
    /** The `x` coordinate variable as a tree. */
    _libfive_tree_x(): TreePtr;
    /** The `y` coordinate variable as a tree. */
    _libfive_tree_y(): TreePtr;
    /** The `z` coordinate variable as a tree. */
    _libfive_tree_z(): TreePtr;
    /** A new free variable (evaluates via an evaluator's vars). */
    _libfive_tree_var(): TreePtr;
    /** 1 when the tree is a free variable, 0 otherwise (int32-as-bool). */
    _libfive_tree_is_var(tree: TreePtr): number;
    /** A constant tree holding `value`. */
    _libfive_tree_const(value: number): TreePtr;
    /** A tree built from a nullary opcode (no operands). */
    _libfive_tree_nullary(opcode: number): TreePtr;
    /** A tree applying a unary opcode to `a`. */
    _libfive_tree_unary(opcode: number, a: TreePtr): TreePtr;
    /** A tree applying a binary opcode to `a` and `b`. */
    _libfive_tree_binary(opcode: number, a: TreePtr, b: TreePtr): TreePtr;
    /** The tree's unique identity handle (used as a map key). */
    _libfive_tree_id(tree: TreePtr): TreePtr;
    /** Releases a kernel tree handle. */
    _libfive_tree_delete(tree: TreePtr): void;
    /** Coordinate remapping: `q(x,y,z) = p(x'(x,y,z), y'(…), z'(…))`. */
    _libfive_tree_remap(
        tree: TreePtr,
        x: TreePtr,
        y: TreePtr,
        z: TreePtr,
    ): TreePtr;
    /** A kernel-optimized copy of the tree; the original is untouched. */
    _libfive_tree_optimized(tree: TreePtr): TreePtr;
    /** Returns a kernel-owned C string; release with `_libfive_free_str`. */
    _libfive_tree_print(tree: TreePtr): StrPtr;
    /** Releases a kernel-owned string. */
    _libfive_free_str(ptr: StrPtr): void;

    // --- Opcode lookup ---
    /** Negative result means unknown opcode name. */
    _libfive_opcode_enum(name: StrPtr): number;
    /** The arity (0–2) of an opcode, or a negative value when unknown. */
    _libfive_opcode_args(opcode: number): number;
    /** Convenience over `_libfive_opcode_enum`: throws on unknown names. */
    opcodeByName(name: string): number;

    // --- Kernel object deleters ---
    /** Releases a `libfive_mesh` and its buffers. */
    _libfive_mesh_delete(mesh: MeshPtr): void;
    /** Releases a `libfive_evaluator`. */
    _libfive_evaluator_delete(evaluator: EvaluatorPtr): void;
    /** Releases a `libfive_vars` table. */
    _libfive_vars_delete(vars: VarsPtr): void;

    // --- ABI shims (wasm/shim.h) ---
    /** Writes the six interval bounds into a `libfive_region3`. */
    _shim_region3_set(
        region: VoidPtr,
        xLower: number,
        xUpper: number,
        yLower: number,
        yUpper: number,
        zLower: number,
        zUpper: number,
    ): void;
    /** Writes three floats into a `libfive_vec3`. */
    _shim_vec3_set(vec: VoidPtr, x: number, y: number, z: number): void;
    /** The tree's value at a `libfive_vec3` point. */
    _shim_tree_eval_f(tree: TreePtr, point: VoidPtr): number;
    /** Interval bounds of the tree over a `libfive_region3`, into `out`. */
    _shim_tree_eval_r(
        tree: TreePtr,
        region: VoidPtr,
        out: VoidPtr,
    ): void;
    /** The tree's gradient at a point, into the `libfive_vec3` `out`. */
    _shim_tree_eval_d(tree: TreePtr, point: VoidPtr, out: VoidPtr): void;
    /** Writes 0/1 to `success` and returns the constant value. */
    _shim_tree_get_const(tree: TreePtr, success: VoidPtr): number;
    /**
     * Meshes the tree over a region (single-threaded kernel, AD-014);
     * returns a kernel-owned `libfive_mesh` to release with
     * `_libfive_mesh_delete`.
     */
    _shim_tree_render_mesh_st(
        tree: TreePtr,
        region: VoidPtr,
        res: number,
    ): MeshPtr;
    /** The mesh's vertex buffer (float x,y,z triplets). */
    _shim_mesh_verts(mesh: MeshPtr): VoidPtr;
    /** The mesh's index buffer (uint32 triangles). */
    _shim_mesh_tris(mesh: MeshPtr): VoidPtr;
    /** The vertex count (one third of the vertex buffer's floats). */
    _shim_mesh_vert_count(mesh: MeshPtr): number;
    /** The triangle count (one third of the index buffer's uint32s). */
    _shim_mesh_tri_count(mesh: MeshPtr): number;
    /** Creates an evaluator over a tree (vars bound later). */
    _shim_tree_evaluator(tree: TreePtr, vars: VoidPtr): EvaluatorPtr;
    /** 1 on success, 0 on failure (C bool flattened). */
    _shim_evaluator_update_vars(evaluator: EvaluatorPtr, vars: VoidPtr): number;

    // --- Allocator ---
    /** Allocates `size` bytes on the wasm heap. */
    _malloc(size: number): VoidPtr;
    /** Frees a `_malloc` allocation. */
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
    /** Reads a NUL-terminated UTF-8 C string from the heap. */
    UTF8ToString(ptr: VoidPtr, maxBytes?: number): string;
    /** Writes a JS string as UTF-8 into a pre-allocated buffer. */
    stringToUTF8(text: string, out: VoidPtr, maxBytes: number): void;
    /** The UTF-8 byte length of `text` (excluding any NUL). */
    lengthBytesUTF8(text: string): number;
    /** Reads a scalar of `type` from the heap. */
    getValue(ptr: VoidPtr, type: WasmValueType): number;
    /** Writes a scalar of `type` to the heap. */
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
    /** A fresh `Float32Array` view over `length` floats. */
    f32View(ptr: VoidPtr, length: number): Float32Array;
    /** A fresh `Uint32Array` view over `length` elements. */
    u32View(ptr: VoidPtr, length: number): Uint32Array;
    /** A fresh `Uint8Array` view over `length` bytes. */
    u8View(ptr: VoidPtr, length: number): Uint8Array;
    /** Allocates a writable `libfive_region3` helper. */
    allocRegion3(): Region3Ref;
    /** Allocates a writable `libfive_vec3` helper. */
    allocVec3(): Vec3Ref;
    /** Allocates an 8-byte `libfive_interval` out-parameter. */
    allocIntervalOut(): IntervalRef;
    /** Allocates a writable `libfive_vec3` out-parameter. */
    allocVec3Out(): Vec3Ref;
}

/**
 * The full Emscripten module behind `RawLibfive`. It carries additional
 * untyped internals (runtime plumbing, stdlib symbols appended at link
 * time); only the `RawLibfive` surface is the contract (AD-011).
 */
export type LibfiveModule = RawLibfive;
