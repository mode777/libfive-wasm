/*
 * libfive-wasm: public convenience-API types (api-design.md).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { Shape } from './shape.js';

/** Anything that can act as a scalar in a tree expression (AD-003). */
export type TFloat = number | Shape;

/** Tree-or-number vectors: components may each be `number | Shape`. */
export type Vec2Arg = [TFloat, TFloat];
/** Tree-or-number vectors: components may each be `number | Shape`. */
export type Vec3Arg = [TFloat, TFloat, TFloat];

/** Axis-aligned region: min/max corners. */
export interface Region3 {
    /** Lower corner `[x, y, z]`. */
    min: Vec3Arg;
    /** Upper corner `[x, y, z]`. */
    max: Vec3Arg;
}

/** Options for meshing a shape (AD-009). */
export interface MeshOptions {
    /**
     * The axis-aligned bounds to mesh, given as min/max corners. The mesher
     * only looks inside this box, so it must enclose the shape.
     */
    region: Region3;
    /**
     * Mesh resolution: the **inverse of the mesher's minimum feature size** —
     * the kernel meshes with `min_feature = 1/res`; larger values produce
     * finer meshes, and a value so small that `1/res` exceeds the region
     * size produces an empty mesh. Not a voxel count.
     */
    res: number;
}
