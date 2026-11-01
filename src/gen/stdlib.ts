/*
 * libfive-wasm: generated standard-library surface (AD-017, AD-024).
 *
 * DO NOT EDIT BY HAND. Regenerate with `npm run gen:stdlib`
 * (scripts/gen-stdlib-ts.mjs) after vendoring a new libfive pin.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { Shape } from '../api/shape.js';
import type { TFloat, Vec2Arg, Vec3Arg } from '../api/types.js';

/** Argument kind of one C stdlib parameter. */
export type StdlibArgKind = 'tree' | 'tfloat' | 'vec2' | 'vec3' | 'int' | 'string';

/** One parameter of a generated stdlib function. */
export interface StdlibArgSpec {
    /** Header argument name (snake_case). */
    readonly name: string;
    readonly kind: StdlibArgKind;
    readonly optional: boolean;
    /** Upstream `__N` default, repeated per vector component. */
    readonly defaultValue?: number;
}

/** One generated stdlib declaration. */
export interface StdlibSpec {
    readonly section: string;
    /** C symbol verbatim (leading underscore included). */
    readonly cName: string;
    /** JS function name (camelCase). */
    readonly jsName: string;
    /** Generated flat C shim symbol. */
    readonly shim: string;
    /** Method name when the first C argument is a receiver shape. */
    readonly method?: string;
    /** Header doc comment. */
    readonly doc: string;
    readonly args: readonly StdlibArgSpec[];
}

/** One `LIBFIVE_ALIAS` entry, resolved to its declaration. */
export interface StdlibAliasSpec {
    readonly section: string;
    readonly jsName: string;
    readonly aliasOf: string;
    readonly method?: string;
}

/** Every generated stdlib declaration, in header order. */
export const STDLIB_SPECS: readonly StdlibSpec[] = [
    {
        section: "csg",
        cName: "_union",
        jsName: "union",
        shim: "shim_stdlib_union",
        method: "union",
        doc: "Returns the union of two shapes",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "intersection",
        jsName: "intersection",
        shim: "shim_stdlib_intersection",
        method: "intersect",
        doc: "Returns the intersection of two shapes",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "inverse",
        jsName: "inverse",
        shim: "shim_stdlib_inverse",
        method: "inverse",
        doc: "Returns a shape that's the inverse of the input shape",
        args: [
            { name: "a", kind: "tree", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "difference",
        jsName: "difference",
        shim: "shim_stdlib_difference",
        method: "difference",
        doc: "Subtracts the second shape from the first",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "offset",
        jsName: "offset",
        shim: "shim_stdlib_offset",
        method: "offset",
        doc: "Expand or contract a given shape by an offset\nPositive offsets expand the shape; negative offsets shrink it",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "o", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "clearance",
        jsName: "clearance",
        shim: "shim_stdlib_clearance",
        method: "clearance",
        doc: "Expands shape b by the given offset then subtracts it from shape a",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
            { name: "offset", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "shell",
        jsName: "shell",
        shim: "shim_stdlib_shell",
        method: "shell",
        doc: "Returns a shell of a shape with the given offset",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "offset", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "blend_expt",
        jsName: "blendExpt",
        shim: "shim_stdlib_blend_expt",
        method: "blendExpt",
        doc: "Blends two shapes by the given amount using exponents",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
            { name: "m", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "blend_expt_unit",
        jsName: "blendExptUnit",
        shim: "shim_stdlib_blend_expt_unit",
        method: "blendExptUnit",
        doc: "Blends two shapes by the given amount using exponents,\nwith the blend term adjusted to produce results approximately\nresembling blend_rough for values between 0 and 1.",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
            { name: "m", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "blend_rough",
        jsName: "blendRough",
        shim: "shim_stdlib_blend_rough",
        method: "blendRough",
        doc: "Blends two shapes by the given amount, using a fast-but-rough\nCSG approximation that may not preserve gradients",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
            { name: "m", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "blend_difference",
        jsName: "blendDifference",
        shim: "shim_stdlib_blend_difference",
        method: "blendDifference",
        doc: "Blends the subtraction of b, with optional offset o,\nfrom a, with smoothness m",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
            { name: "m", kind: "tfloat", optional: false },
            { name: "o", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "csg",
        cName: "morph",
        jsName: "morph",
        shim: "shim_stdlib_morph",
        method: "morph",
        doc: "Morphs between two shapes.\nm = 0 produces a, m = 1 produces b",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
            { name: "m", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "loft",
        jsName: "loft",
        shim: "shim_stdlib_loft",
        method: "loft",
        doc: "Produces a blended loft between a (at zmin) and b (at zmax)\na and b should be 2D shapes (i.e. invariant along the z axis)",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
            { name: "zmin", kind: "tfloat", optional: false },
            { name: "zmax", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "csg",
        cName: "loft_between",
        jsName: "loftBetween",
        shim: "shim_stdlib_loft_between",
        method: "loftBetween",
        doc: "Produces a blended loft between a (at lower.z) and b (at upper.z),\nwith XY coordinates remapped to slide between lower.xy and upper.xy.\na and b should be 2D shapes (i.e. invariant along the z axis)",
        args: [
            { name: "a", kind: "tree", optional: false },
            { name: "b", kind: "tree", optional: false },
            { name: "lower", kind: "vec3", optional: false },
            { name: "upper", kind: "vec3", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "circle",
        jsName: "circle",
        shim: "shim_stdlib_circle",
        doc: "A 2D circle with the given radius and optional center",
        args: [
            { name: "r", kind: "tfloat", optional: false },
            { name: "center", kind: "vec2", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "ring",
        jsName: "ring",
        shim: "shim_stdlib_ring",
        doc: "A 2D ring with the given outer/inner radii and optional center",
        args: [
            { name: "ro", kind: "tfloat", optional: false },
            { name: "ri", kind: "tfloat", optional: false },
            { name: "center", kind: "vec2", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "polygon",
        jsName: "polygon",
        shim: "shim_stdlib_polygon",
        doc: "A polygon with center-to-vertex distance r and n sides",
        args: [
            { name: "r", kind: "tfloat", optional: false },
            { name: "n", kind: "int", optional: false },
            { name: "center", kind: "vec2", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "rectangle",
        jsName: "rectangle",
        shim: "shim_stdlib_rectangle",
        doc: "A rectangle with the given bounding corners",
        args: [
            { name: "a", kind: "vec2", optional: false },
            { name: "b", kind: "vec2", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "rounded_rectangle",
        jsName: "roundedRectangle",
        shim: "shim_stdlib_rounded_rectangle",
        doc: "A rectangle with rounded corners",
        args: [
            { name: "a", kind: "vec2", optional: false },
            { name: "b", kind: "vec2", optional: false },
            { name: "r", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "rectangle_exact",
        jsName: "rectangleExact",
        shim: "shim_stdlib_rectangle_exact",
        doc: "A rectangle from an exact distance field",
        args: [
            { name: "a", kind: "vec2", optional: false },
            { name: "b", kind: "vec2", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "rectangle_centered_exact",
        jsName: "rectangleCenteredExact",
        shim: "shim_stdlib_rectangle_centered_exact",
        doc: "An exact-field rectangle at the (optional) center",
        args: [
            { name: "size", kind: "vec2", optional: false },
            { name: "center", kind: "vec2", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "triangle",
        jsName: "triangle",
        shim: "shim_stdlib_triangle",
        doc: "A 2D triangle",
        args: [
            { name: "a", kind: "vec2", optional: false },
            { name: "b", kind: "vec2", optional: false },
            { name: "c", kind: "vec2", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "box_mitered",
        jsName: "boxMitered",
        shim: "shim_stdlib_box_mitered",
        doc: "A box with the given bounds, which will stay creased if offset",
        args: [
            { name: "a", kind: "vec3", optional: false },
            { name: "b", kind: "vec3", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "box_mitered_centered",
        jsName: "boxMiteredCentered",
        shim: "shim_stdlib_box_mitered_centered",
        doc: "A box with the given size and (optional) center, with edges that\nwill stay sharp if offset.",
        args: [
            { name: "size", kind: "vec3", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "box_exact_centered",
        jsName: "boxExactCentered",
        shim: "shim_stdlib_box_exact_centered",
        doc: "A box with the given size, centered around the given point,\nwith a Euclidean distance metric",
        args: [
            { name: "size", kind: "vec3", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "box_exact",
        jsName: "boxExact",
        shim: "shim_stdlib_box_exact",
        doc: "A box with the given bounds with a Euclidean distance metric",
        args: [
            { name: "a", kind: "vec3", optional: false },
            { name: "b", kind: "vec3", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "rounded_box",
        jsName: "roundedBox",
        shim: "shim_stdlib_rounded_box",
        doc: "Rounded box with the given bounds and radius (as a 0-1 fraction)",
        args: [
            { name: "a", kind: "vec3", optional: false },
            { name: "b", kind: "vec3", optional: false },
            { name: "r", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "sphere",
        jsName: "sphere",
        shim: "shim_stdlib_sphere",
        doc: "A sphere with the given radius and (optional) center",
        args: [
            { name: "radius", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "half_space",
        jsName: "halfSpace",
        shim: "shim_stdlib_half_space",
        doc: "A plane which divides the world into inside and outside, defined by its\nnormal and a single point on the plane",
        args: [
            { name: "norm", kind: "vec3", optional: false },
            { name: "point", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "cylinder_z",
        jsName: "cylinderZ",
        shim: "shim_stdlib_cylinder_z",
        doc: "A cylinder with the given radius and height, extruded from the\n(optional) base position.",
        args: [
            { name: "r", kind: "tfloat", optional: false },
            { name: "h", kind: "tfloat", optional: false },
            { name: "base", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "cone_ang_z",
        jsName: "coneAngZ",
        shim: "shim_stdlib_cone_ang_z",
        doc: "A cone defined by its slope angle, height, and (optional) base location",
        args: [
            { name: "angle", kind: "tfloat", optional: false },
            { name: "height", kind: "tfloat", optional: false },
            { name: "base", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "cone_z",
        jsName: "coneZ",
        shim: "shim_stdlib_cone_z",
        doc: "A cone defined by its radius, height, and (optional) base location",
        args: [
            { name: "radius", kind: "tfloat", optional: false },
            { name: "height", kind: "tfloat", optional: false },
            { name: "base", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "pyramid_z",
        jsName: "pyramidZ",
        shim: "shim_stdlib_pyramid_z",
        doc: "A pyramid defined by its base rectangle, lower Z value, and height",
        args: [
            { name: "a", kind: "vec2", optional: false },
            { name: "b", kind: "vec2", optional: false },
            { name: "zmin", kind: "tfloat", optional: false },
            { name: "height", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "torus_z",
        jsName: "torusZ",
        shim: "shim_stdlib_torus_z",
        doc: "A torus with the given outer radius, inner radius, and (optional) center",
        args: [
            { name: "ro", kind: "tfloat", optional: false },
            { name: "ri", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "gyroid",
        jsName: "gyroid",
        shim: "shim_stdlib_gyroid",
        doc: "A volume-filling gyroid with the given periods and thickness",
        args: [
            { name: "period", kind: "vec3", optional: false },
            { name: "thickness", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "emptiness",
        jsName: "emptiness",
        shim: "shim_stdlib_emptiness",
        doc: "A value which is empty everywhere",
        args: [],
    },
    {
        section: "shapes",
        cName: "array_x",
        jsName: "arrayX",
        shim: "shim_stdlib_array_x",
        method: "arrayX",
        doc: "Iterates a part in a 1D array",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "nx", kind: "int", optional: false },
            { name: "dx", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "array_xy",
        jsName: "arrayXY",
        shim: "shim_stdlib_array_xy",
        method: "arrayXY",
        doc: "Iterates a part in a 2D array",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "nx", kind: "int", optional: false },
            { name: "ny", kind: "int", optional: false },
            { name: "delta", kind: "vec2", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "array_xyz",
        jsName: "arrayXYZ",
        shim: "shim_stdlib_array_xyz",
        method: "arrayXYZ",
        doc: "Iterates a part in a 3D array",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "nx", kind: "int", optional: false },
            { name: "ny", kind: "int", optional: false },
            { name: "nz", kind: "int", optional: false },
            { name: "delta", kind: "vec3", optional: false },
        ],
    },
    {
        section: "shapes",
        cName: "array_polar_z",
        jsName: "arrayPolarZ",
        shim: "shim_stdlib_array_polar_z",
        method: "arrayPolarZ",
        doc: "Iterates a shape about an optional center position",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "n", kind: "int", optional: false },
            { name: "center", kind: "vec2", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "shapes",
        cName: "extrude_z",
        jsName: "extrudeZ",
        shim: "shim_stdlib_extrude_z",
        method: "extrudeZ",
        doc: "Extrudes a 2D shape between zmin and zmax",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "zmin", kind: "tfloat", optional: false },
            { name: "zmax", kind: "tfloat", optional: false },
        ],
    },
    {
        section: "transforms",
        cName: "move",
        jsName: "move",
        shim: "shim_stdlib_move",
        method: "move",
        doc: "Moves the given shape in 2D or 3D space",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "offset", kind: "vec3", optional: false },
        ],
    },
    {
        section: "transforms",
        cName: "reflect_x",
        jsName: "reflectX",
        shim: "shim_stdlib_reflect_x",
        method: "reflectX",
        doc: "Reflects a shape about the x origin or an optional offset",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "x0", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "reflect_y",
        jsName: "reflectY",
        shim: "shim_stdlib_reflect_y",
        method: "reflectY",
        doc: "Reflects a shape about the y origin or an optional offset",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "y0", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "reflect_z",
        jsName: "reflectZ",
        shim: "shim_stdlib_reflect_z",
        method: "reflectZ",
        doc: "Reflects a shape about the z origin or an optional offset",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "z0", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "reflect_xy",
        jsName: "reflectXY",
        shim: "shim_stdlib_reflect_xy",
        method: "reflectXY",
        doc: "Reflects a shape about the plane X=Y",
        args: [
            { name: "t", kind: "tree", optional: false },
        ],
    },
    {
        section: "transforms",
        cName: "reflect_yz",
        jsName: "reflectYZ",
        shim: "shim_stdlib_reflect_yz",
        method: "reflectYZ",
        doc: "Reflects a shape about the plane Y=Z",
        args: [
            { name: "t", kind: "tree", optional: false },
        ],
    },
    {
        section: "transforms",
        cName: "reflect_xz",
        jsName: "reflectXZ",
        shim: "shim_stdlib_reflect_xz",
        method: "reflectXZ",
        doc: "Reflects a shape about the plane X=Z",
        args: [
            { name: "t", kind: "tree", optional: false },
        ],
    },
    {
        section: "transforms",
        cName: "symmetric_x",
        jsName: "symmetricX",
        shim: "shim_stdlib_symmetric_x",
        method: "symmetricX",
        doc: "Clips the given shape at the x origin, then duplicates the remaining\nshape reflected on the other side of the origin",
        args: [
            { name: "t", kind: "tree", optional: false },
        ],
    },
    {
        section: "transforms",
        cName: "symmetric_y",
        jsName: "symmetricY",
        shim: "shim_stdlib_symmetric_y",
        method: "symmetricY",
        doc: "Clips the given shape at the y origin, then duplicates the remaining\nshape reflected on the other side of the origin",
        args: [
            { name: "t", kind: "tree", optional: false },
        ],
    },
    {
        section: "transforms",
        cName: "symmetric_z",
        jsName: "symmetricZ",
        shim: "shim_stdlib_symmetric_z",
        method: "symmetricZ",
        doc: "Clips the given shape at the z origin, then duplicates the remaining\nshape reflected on the other side of the origin",
        args: [
            { name: "t", kind: "tree", optional: false },
        ],
    },
    {
        section: "transforms",
        cName: "scale_x",
        jsName: "scaleX",
        shim: "shim_stdlib_scale_x",
        method: "scaleX",
        doc: "Scales a shape by sx on the x axis about 0 or an optional offset",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "sx", kind: "tfloat", optional: false },
            { name: "x0", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "scale_y",
        jsName: "scaleY",
        shim: "shim_stdlib_scale_y",
        method: "scaleY",
        doc: "Scales a shape by sx on the x axis about 0 or an optional offset",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "sy", kind: "tfloat", optional: false },
            { name: "y0", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "scale_z",
        jsName: "scaleZ",
        shim: "shim_stdlib_scale_z",
        method: "scaleZ",
        doc: "Scales a shape by sx on the x axis about 0 or an optional offset",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "sz", kind: "tfloat", optional: false },
            { name: "z0", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "scale_xyz",
        jsName: "scaleXYZ",
        shim: "shim_stdlib_scale_xyz",
        method: "scaleXYZ",
        doc: "Scales a shape on all three axes, about 0 or an optional offset",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "s", kind: "vec3", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "rotate_x",
        jsName: "rotateX",
        shim: "shim_stdlib_rotate_x",
        method: "rotateX",
        doc: "Rotate the given shape by an angle in radians\nThe center of rotation is [0 0 0] or specified by the optional argument",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "angle", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "rotate_y",
        jsName: "rotateY",
        shim: "shim_stdlib_rotate_y",
        method: "rotateY",
        doc: "Rotate the given shape by an angle in radians\nThe center of rotation is [0 0 0] or specified by the optional argument",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "angle", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "rotate_z",
        jsName: "rotateZ",
        shim: "shim_stdlib_rotate_z",
        method: "rotateZ",
        doc: "Rotate the given shape by an angle in radians\nThe center of rotation is [0 0 0] or specified by the optional argument",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "angle", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "taper_x_y",
        jsName: "taperXY",
        shim: "shim_stdlib_taper_x_y",
        method: "taperXY",
        doc: "Tapers a shape along the x axis as a function of y\nwidth = base-scale at base\nwidth = scale at base + [0 h]",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "base", kind: "vec2", optional: false },
            { name: "h", kind: "tfloat", optional: false },
            { name: "scale", kind: "tfloat", optional: false },
            { name: "base_scale", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "taper_xy_z",
        jsName: "taperXYZ",
        shim: "shim_stdlib_taper_xy_z",
        method: "taperXYZ",
        doc: "Tapers a shape in the xy plane as a function of z\nwidth = base-scale at base\nwidth = scale at base + [0 0 height]",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "base", kind: "vec3", optional: false },
            { name: "height", kind: "tfloat", optional: false },
            { name: "scale", kind: "tfloat", optional: false },
            { name: "base_scale", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "shear_x_y",
        jsName: "shearXY",
        shim: "shim_stdlib_shear_x_y",
        method: "shearXY",
        doc: "Shears a shape on the x axis as a function of y\noffset = base-offset at base.y\noffset = offset = base.y + h",
        args: [
            { name: "t", kind: "tree", optional: false },
            { name: "base", kind: "vec2", optional: false },
            { name: "height", kind: "tfloat", optional: false },
            { name: "offset", kind: "tfloat", optional: false },
            { name: "base_offset", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "repel",
        jsName: "repel",
        shim: "shim_stdlib_repel",
        method: "repel",
        doc: "Repels the shape away from a point based upon a radius r,\nwith optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "repel_x",
        jsName: "repelX",
        shim: "shim_stdlib_repel_x",
        method: "repelX",
        doc: "Repels the shape away from a YZ plane based upon a radius r,\nwith optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "repel_y",
        jsName: "repelY",
        shim: "shim_stdlib_repel_y",
        method: "repelY",
        doc: "Repels the shape away from a XZ plane based upon a radius r,\nwith optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "repel_z",
        jsName: "repelZ",
        shim: "shim_stdlib_repel_z",
        method: "repelZ",
        doc: "Repels the shape away from a XY plane based upon a radius r,\nwith optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "repel_xy",
        jsName: "repelXY",
        shim: "shim_stdlib_repel_xy",
        method: "repelXY",
        doc: "Repels the shape away from line parallel to the Z axis,\nwith a particular radius and optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "repel_yz",
        jsName: "repelYZ",
        shim: "shim_stdlib_repel_yz",
        method: "repelYZ",
        doc: "Repels the shape away from line parallel to the X axis,\nwith a particular radius and optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "repel_xz",
        jsName: "repelXZ",
        shim: "shim_stdlib_repel_xz",
        method: "repelXZ",
        doc: "Repels the shape away from line parallel to the Y axis,\nwith a particular radius and optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "attract",
        jsName: "attract",
        shim: "shim_stdlib_attract",
        method: "attract",
        doc: "Attracts the shape away from a point based upon a radius r,\nwith optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "attract_x",
        jsName: "attractX",
        shim: "shim_stdlib_attract_x",
        method: "attractX",
        doc: "Attracts the shape away from a YZ plane based upon a radius r,\nwith optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "attract_y",
        jsName: "attractY",
        shim: "shim_stdlib_attract_y",
        method: "attractY",
        doc: "Attracts the shape away from a XZ plane based upon a radius r,\nwith optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "attract_z",
        jsName: "attractZ",
        shim: "shim_stdlib_attract_z",
        method: "attractZ",
        doc: "Attracts the shape away from a XY plane based upon a radius r,\nwith optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "attract_xy",
        jsName: "attractXY",
        shim: "shim_stdlib_attract_xy",
        method: "attractXY",
        doc: "Attracts the shape away from line parallel to the Z axis,\nwith a particular radius and optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "attract_yz",
        jsName: "attractYZ",
        shim: "shim_stdlib_attract_yz",
        method: "attractYZ",
        doc: "Attracts the shape away from line parallel to the X axis,\nwith a particular radius and optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "attract_xz",
        jsName: "attractXZ",
        shim: "shim_stdlib_attract_xz",
        method: "attractXZ",
        doc: "Attracts the shape away from line parallel to the Y axis,\nwith a particular radius and optional exaggeration",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "locus", kind: "vec3", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "exaggerate", kind: "tfloat", optional: true, defaultValue: 1 },
        ],
    },
    {
        section: "transforms",
        cName: "revolve_y",
        jsName: "revolveY",
        shim: "shim_stdlib_revolve_y",
        method: "revolveY",
        doc: "Revolves a 2D (XY) shape about a line parallel to the Y axis with the\ngiven x value",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "x0", kind: "tfloat", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "twirl_x",
        jsName: "twirlX",
        shim: "shim_stdlib_twirl_x",
        method: "twirlX",
        doc: "Twirls the shape in the x axis about the (optional) center point",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "amount", kind: "tfloat", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "twirl_axis_x",
        jsName: "twirlAxisX",
        shim: "shim_stdlib_twirl_axis_x",
        method: "twirlAxisX",
        doc: "Twirls the shape in the x axis about the line extending from the\n(optional) center point",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "amount", kind: "tfloat", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "twirl_y",
        jsName: "twirlY",
        shim: "shim_stdlib_twirl_y",
        method: "twirlY",
        doc: "Twirls the shape in the y axis about the (optional) center point",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "amount", kind: "tfloat", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "twirl_axis_y",
        jsName: "twirlAxisY",
        shim: "shim_stdlib_twirl_axis_y",
        method: "twirlAxisY",
        doc: "Twirls the shape in the y axis about the line extending from the\n(optional) center point",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "amount", kind: "tfloat", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "twirl_z",
        jsName: "twirlZ",
        shim: "shim_stdlib_twirl_z",
        method: "twirlZ",
        doc: "Twirls the shape in the z axis about the (optional) center point",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "amount", kind: "tfloat", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "transforms",
        cName: "twirl_axis_z",
        jsName: "twirlAxisZ",
        shim: "shim_stdlib_twirl_axis_z",
        method: "twirlAxisZ",
        doc: "Twirls the shape in the z axis about the line extending from the\n(optional) center point",
        args: [
            { name: "shape", kind: "tree", optional: false },
            { name: "amount", kind: "tfloat", optional: false },
            { name: "radius", kind: "tfloat", optional: false },
            { name: "center", kind: "vec3", optional: true, defaultValue: 0 },
        ],
    },
    {
        section: "text",
        cName: "text",
        jsName: "text",
        shim: "shim_stdlib_text",
        doc: "Returns the given text, rendered in a custom f-rep font\n(with a character height of 1)",
        args: [
            { name: "txt", kind: "string", optional: false },
            { name: "pos", kind: "vec2", optional: true, defaultValue: 0 },
        ],
    },
];

/** Every upstream alias, resolved to its declaration. */
export const STDLIB_ALIASES: readonly StdlibAliasSpec[] = [
    { section: "csg", jsName: "blend", aliasOf: "blendExptUnit", method: "blend", },
    { section: "shapes", jsName: "cube", aliasOf: "boxMitered", },
    { section: "shapes", jsName: "cubeCentered", aliasOf: "boxMiteredCentered", },
    { section: "shapes", jsName: "box", aliasOf: "boxMitered", },
    { section: "shapes", jsName: "boxCentered", aliasOf: "boxMiteredCentered", },
    { section: "shapes", jsName: "roundedCube", aliasOf: "roundedBox", },
    { section: "shapes", jsName: "cylinder", aliasOf: "cylinderZ", },
    { section: "shapes", jsName: "coneAng", aliasOf: "coneAngZ", },
    { section: "shapes", jsName: "cone", aliasOf: "coneZ", },
    { section: "shapes", jsName: "torus", aliasOf: "torusZ", },
    { section: "shapes", jsName: "arrayPolar", aliasOf: "arrayPolarZ", method: "arrayPolar", },
    { section: "transforms", jsName: "rotate", aliasOf: "rotateZ", method: "rotate", },
];

/** Generated method-form names (installed on `Shape.prototype`). */
export const STDLIB_METHOD_NAMES: readonly string[] = [
    "union",
    "intersect",
    "inverse",
    "difference",
    "offset",
    "clearance",
    "shell",
    "blendExpt",
    "blendExptUnit",
    "blendRough",
    "blendDifference",
    "morph",
    "loft",
    "loftBetween",
    "arrayX",
    "arrayXY",
    "arrayXYZ",
    "arrayPolarZ",
    "extrudeZ",
    "move",
    "reflectX",
    "reflectY",
    "reflectZ",
    "reflectXY",
    "reflectYZ",
    "reflectXZ",
    "symmetricX",
    "symmetricY",
    "symmetricZ",
    "scaleX",
    "scaleY",
    "scaleZ",
    "scaleXYZ",
    "rotateX",
    "rotateY",
    "rotateZ",
    "taperXY",
    "taperXYZ",
    "shearXY",
    "repel",
    "repelX",
    "repelY",
    "repelZ",
    "repelXY",
    "repelYZ",
    "repelXZ",
    "attract",
    "attractX",
    "attractY",
    "attractZ",
    "attractXY",
    "attractYZ",
    "attractXZ",
    "revolveY",
    "twirlX",
    "twirlAxisX",
    "twirlY",
    "twirlAxisY",
    "twirlZ",
    "twirlAxisZ",
    "blend",
    "arrayPolar",
    "rotate",
];

/**
 * Every generated stdlib function, exposed on the `init()` instance.
 * Plain numbers coerce to constant trees; optional arguments use the
 * kernel defaults recorded in {@link STDLIB_SPECS}.
 */
export interface StdlibFunctions {
    /** Returns the union of two shapes */
    union(a: TFloat, b: TFloat): Shape;
    /** Returns the intersection of two shapes */
    intersection(a: TFloat, b: TFloat): Shape;
    /** Returns a shape that's the inverse of the input shape */
    inverse(a: TFloat): Shape;
    /** Subtracts the second shape from the first */
    difference(a: TFloat, b: TFloat): Shape;
    /**
     * Expand or contract a given shape by an offset
     * Positive offsets expand the shape; negative offsets shrink it
     */
    offset(a: TFloat, o: TFloat): Shape;
    /** Expands shape b by the given offset then subtracts it from shape a */
    clearance(a: TFloat, b: TFloat, offset: TFloat): Shape;
    /** Returns a shell of a shape with the given offset */
    shell(a: TFloat, offset: TFloat): Shape;
    /** Blends two shapes by the given amount using exponents */
    blendExpt(a: TFloat, b: TFloat, m: TFloat): Shape;
    /**
     * Blends two shapes by the given amount using exponents,
     * with the blend term adjusted to produce results approximately
     * resembling blend_rough for values between 0 and 1.
     */
    blendExptUnit(a: TFloat, b: TFloat, m: TFloat): Shape;
    /**
     * Blends two shapes by the given amount, using a fast-but-rough
     * CSG approximation that may not preserve gradients
     */
    blendRough(a: TFloat, b: TFloat, m: TFloat): Shape;
    /**
     * Blends the subtraction of b, with optional offset o,
     * from a, with smoothness m
     */
    blendDifference(a: TFloat, b: TFloat, m: TFloat, o?: TFloat): Shape;
    /**
     * Morphs between two shapes.
     * m = 0 produces a, m = 1 produces b
     */
    morph(a: TFloat, b: TFloat, m: TFloat): Shape;
    /**
     * Produces a blended loft between a (at zmin) and b (at zmax)
     * a and b should be 2D shapes (i.e. invariant along the z axis)
     */
    loft(a: TFloat, b: TFloat, zmin: TFloat, zmax: TFloat): Shape;
    /**
     * Produces a blended loft between a (at lower.z) and b (at upper.z),
     * with XY coordinates remapped to slide between lower.xy and upper.xy.
     * a and b should be 2D shapes (i.e. invariant along the z axis)
     */
    loftBetween(a: TFloat, b: TFloat, lower: Vec3Arg, upper: Vec3Arg): Shape;
    /** A 2D circle with the given radius and optional center */
    circle(r: TFloat, center?: Vec2Arg): Shape;
    /** A 2D ring with the given outer/inner radii and optional center */
    ring(ro: TFloat, ri: TFloat, center?: Vec2Arg): Shape;
    /** A polygon with center-to-vertex distance r and n sides */
    polygon(r: TFloat, n: number, center?: Vec2Arg): Shape;
    /** A rectangle with the given bounding corners */
    rectangle(a: Vec2Arg, b: Vec2Arg): Shape;
    /** A rectangle with rounded corners */
    roundedRectangle(a: Vec2Arg, b: Vec2Arg, r: TFloat): Shape;
    /** A rectangle from an exact distance field */
    rectangleExact(a: Vec2Arg, b: Vec2Arg): Shape;
    /** An exact-field rectangle at the (optional) center */
    rectangleCenteredExact(size: Vec2Arg, center?: Vec2Arg): Shape;
    /** A 2D triangle */
    triangle(a: Vec2Arg, b: Vec2Arg, c: Vec2Arg): Shape;
    /** A box with the given bounds, which will stay creased if offset */
    boxMitered(a: Vec3Arg, b: Vec3Arg): Shape;
    /**
     * A box with the given size and (optional) center, with edges that
     * will stay sharp if offset.
     */
    boxMiteredCentered(size: Vec3Arg, center?: Vec3Arg): Shape;
    /**
     * A box with the given size, centered around the given point,
     * with a Euclidean distance metric
     */
    boxExactCentered(size: Vec3Arg, center?: Vec3Arg): Shape;
    /** A box with the given bounds with a Euclidean distance metric */
    boxExact(a: Vec3Arg, b: Vec3Arg): Shape;
    /** Rounded box with the given bounds and radius (as a 0-1 fraction) */
    roundedBox(a: Vec3Arg, b: Vec3Arg, r: TFloat): Shape;
    /** A sphere with the given radius and (optional) center */
    sphere(radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * A plane which divides the world into inside and outside, defined by its
     * normal and a single point on the plane
     */
    halfSpace(norm: Vec3Arg, point?: Vec3Arg): Shape;
    /**
     * A cylinder with the given radius and height, extruded from the
     * (optional) base position.
     */
    cylinderZ(r: TFloat, h: TFloat, base?: Vec3Arg): Shape;
    /** A cone defined by its slope angle, height, and (optional) base location */
    coneAngZ(angle: TFloat, height: TFloat, base?: Vec3Arg): Shape;
    /** A cone defined by its radius, height, and (optional) base location */
    coneZ(radius: TFloat, height: TFloat, base?: Vec3Arg): Shape;
    /** A pyramid defined by its base rectangle, lower Z value, and height */
    pyramidZ(a: Vec2Arg, b: Vec2Arg, zmin: TFloat, height: TFloat): Shape;
    /** A torus with the given outer radius, inner radius, and (optional) center */
    torusZ(ro: TFloat, ri: TFloat, center?: Vec3Arg): Shape;
    /** A volume-filling gyroid with the given periods and thickness */
    gyroid(period: Vec3Arg, thickness: TFloat): Shape;
    /** A value which is empty everywhere */
    emptiness(): Shape;
    /** Iterates a part in a 1D array */
    arrayX(shape: TFloat, nx: number, dx: TFloat): Shape;
    /** Iterates a part in a 2D array */
    arrayXY(shape: TFloat, nx: number, ny: number, delta: Vec2Arg): Shape;
    /** Iterates a part in a 3D array */
    arrayXYZ(shape: TFloat, nx: number, ny: number, nz: number, delta: Vec3Arg): Shape;
    /** Iterates a shape about an optional center position */
    arrayPolarZ(shape: TFloat, n: number, center?: Vec2Arg): Shape;
    /** Extrudes a 2D shape between zmin and zmax */
    extrudeZ(t: TFloat, zmin: TFloat, zmax: TFloat): Shape;
    /** Moves the given shape in 2D or 3D space */
    move(t: TFloat, offset: Vec3Arg): Shape;
    /** Reflects a shape about the x origin or an optional offset */
    reflectX(t: TFloat, x0?: TFloat): Shape;
    /** Reflects a shape about the y origin or an optional offset */
    reflectY(t: TFloat, y0?: TFloat): Shape;
    /** Reflects a shape about the z origin or an optional offset */
    reflectZ(t: TFloat, z0?: TFloat): Shape;
    /** Reflects a shape about the plane X=Y */
    reflectXY(t: TFloat): Shape;
    /** Reflects a shape about the plane Y=Z */
    reflectYZ(t: TFloat): Shape;
    /** Reflects a shape about the plane X=Z */
    reflectXZ(t: TFloat): Shape;
    /**
     * Clips the given shape at the x origin, then duplicates the remaining
     * shape reflected on the other side of the origin
     */
    symmetricX(t: TFloat): Shape;
    /**
     * Clips the given shape at the y origin, then duplicates the remaining
     * shape reflected on the other side of the origin
     */
    symmetricY(t: TFloat): Shape;
    /**
     * Clips the given shape at the z origin, then duplicates the remaining
     * shape reflected on the other side of the origin
     */
    symmetricZ(t: TFloat): Shape;
    /** Scales a shape by sx on the x axis about 0 or an optional offset */
    scaleX(t: TFloat, sx: TFloat, x0?: TFloat): Shape;
    /** Scales a shape by sx on the x axis about 0 or an optional offset */
    scaleY(t: TFloat, sy: TFloat, y0?: TFloat): Shape;
    /** Scales a shape by sx on the x axis about 0 or an optional offset */
    scaleZ(t: TFloat, sz: TFloat, z0?: TFloat): Shape;
    /** Scales a shape on all three axes, about 0 or an optional offset */
    scaleXYZ(t: TFloat, s: Vec3Arg, center?: Vec3Arg): Shape;
    /**
     * Rotate the given shape by an angle in radians
     * The center of rotation is [0 0 0] or specified by the optional argument
     */
    rotateX(t: TFloat, angle: TFloat, center?: Vec3Arg): Shape;
    /**
     * Rotate the given shape by an angle in radians
     * The center of rotation is [0 0 0] or specified by the optional argument
     */
    rotateY(t: TFloat, angle: TFloat, center?: Vec3Arg): Shape;
    /**
     * Rotate the given shape by an angle in radians
     * The center of rotation is [0 0 0] or specified by the optional argument
     */
    rotateZ(t: TFloat, angle: TFloat, center?: Vec3Arg): Shape;
    /**
     * Tapers a shape along the x axis as a function of y
     * width = base-scale at base
     * width = scale at base + [0 h]
     */
    taperXY(shape: TFloat, base: Vec2Arg, h: TFloat, scale: TFloat, baseScale?: TFloat): Shape;
    /**
     * Tapers a shape in the xy plane as a function of z
     * width = base-scale at base
     * width = scale at base + [0 0 height]
     */
    taperXYZ(shape: TFloat, base: Vec3Arg, height: TFloat, scale: TFloat, baseScale?: TFloat): Shape;
    /**
     * Shears a shape on the x axis as a function of y
     * offset = base-offset at base.y
     * offset = offset = base.y + h
     */
    shearXY(t: TFloat, base: Vec2Arg, height: TFloat, offset: TFloat, baseOffset?: TFloat): Shape;
    /**
     * Repels the shape away from a point based upon a radius r,
     * with optional exaggeration
     */
    repel(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from a YZ plane based upon a radius r,
     * with optional exaggeration
     */
    repelX(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from a XZ plane based upon a radius r,
     * with optional exaggeration
     */
    repelY(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from a XY plane based upon a radius r,
     * with optional exaggeration
     */
    repelZ(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from line parallel to the Z axis,
     * with a particular radius and optional exaggeration
     */
    repelXY(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from line parallel to the X axis,
     * with a particular radius and optional exaggeration
     */
    repelYZ(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from line parallel to the Y axis,
     * with a particular radius and optional exaggeration
     */
    repelXZ(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from a point based upon a radius r,
     * with optional exaggeration
     */
    attract(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from a YZ plane based upon a radius r,
     * with optional exaggeration
     */
    attractX(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from a XZ plane based upon a radius r,
     * with optional exaggeration
     */
    attractY(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from a XY plane based upon a radius r,
     * with optional exaggeration
     */
    attractZ(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from line parallel to the Z axis,
     * with a particular radius and optional exaggeration
     */
    attractXY(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from line parallel to the X axis,
     * with a particular radius and optional exaggeration
     */
    attractYZ(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from line parallel to the Y axis,
     * with a particular radius and optional exaggeration
     */
    attractXZ(shape: TFloat, locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Revolves a 2D (XY) shape about a line parallel to the Y axis with the
     * given x value
     */
    revolveY(shape: TFloat, x0?: TFloat): Shape;
    /** Twirls the shape in the x axis about the (optional) center point */
    twirlX(shape: TFloat, amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * Twirls the shape in the x axis about the line extending from the
     * (optional) center point
     */
    twirlAxisX(shape: TFloat, amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /** Twirls the shape in the y axis about the (optional) center point */
    twirlY(shape: TFloat, amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * Twirls the shape in the y axis about the line extending from the
     * (optional) center point
     */
    twirlAxisY(shape: TFloat, amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /** Twirls the shape in the z axis about the (optional) center point */
    twirlZ(shape: TFloat, amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * Twirls the shape in the z axis about the line extending from the
     * (optional) center point
     */
    twirlAxisZ(shape: TFloat, amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * Returns the given text, rendered in a custom f-rep font
     * (with a character height of 1)
     */
    text(txt: string, pos?: Vec2Arg): Shape;
    /**
     * Blends two shapes by the given amount using exponents,
     * with the blend term adjusted to produce results approximately
     * resembling blend_rough for values between 0 and 1.
     * Alias of `blendExptUnit`.
     */
    blend(a: TFloat, b: TFloat, m: TFloat): Shape;
    /**
     * A box with the given bounds, which will stay creased if offset
     * Alias of `boxMitered`.
     */
    cube(a: Vec3Arg, b: Vec3Arg): Shape;
    /**
     * A box with the given size and (optional) center, with edges that
     * will stay sharp if offset.
     * Alias of `boxMiteredCentered`.
     */
    cubeCentered(size: Vec3Arg, center?: Vec3Arg): Shape;
    /**
     * A box with the given bounds, which will stay creased if offset
     * Alias of `boxMitered`.
     */
    box(a: Vec3Arg, b: Vec3Arg): Shape;
    /**
     * A box with the given size and (optional) center, with edges that
     * will stay sharp if offset.
     * Alias of `boxMiteredCentered`.
     */
    boxCentered(size: Vec3Arg, center?: Vec3Arg): Shape;
    /**
     * Rounded box with the given bounds and radius (as a 0-1 fraction)
     * Alias of `roundedBox`.
     */
    roundedCube(a: Vec3Arg, b: Vec3Arg, r: TFloat): Shape;
    /**
     * A cylinder with the given radius and height, extruded from the
     * (optional) base position.
     * Alias of `cylinderZ`.
     */
    cylinder(r: TFloat, h: TFloat, base?: Vec3Arg): Shape;
    /**
     * A cone defined by its slope angle, height, and (optional) base location
     * Alias of `coneAngZ`.
     */
    coneAng(angle: TFloat, height: TFloat, base?: Vec3Arg): Shape;
    /**
     * A cone defined by its radius, height, and (optional) base location
     * Alias of `coneZ`.
     */
    cone(radius: TFloat, height: TFloat, base?: Vec3Arg): Shape;
    /**
     * A torus with the given outer radius, inner radius, and (optional) center
     * Alias of `torusZ`.
     */
    torus(ro: TFloat, ri: TFloat, center?: Vec3Arg): Shape;
    /**
     * Iterates a shape about an optional center position
     * Alias of `arrayPolarZ`.
     */
    arrayPolar(shape: TFloat, n: number, center?: Vec2Arg): Shape;
    /**
     * Rotate the given shape by an angle in radians
     * The center of rotation is [0 0 0] or specified by the optional argument
     * Alias of `rotateZ`.
     */
    rotate(t: TFloat, angle: TFloat, center?: Vec3Arg): Shape;
}

/**
 * Generated method forms: every declaration whose first C argument is
 * a receiver shape, minus the non-stdlib surface owned by `Shape`.
 */
export interface StdlibMethods {
    /** Returns the union of two shapes */
    union(b: TFloat): Shape;
    /** Returns the intersection of two shapes */
    intersect(b: TFloat): Shape;
    /** Returns a shape that's the inverse of the input shape */
    inverse(): Shape;
    /** Subtracts the second shape from the first */
    difference(b: TFloat): Shape;
    /**
     * Expand or contract a given shape by an offset
     * Positive offsets expand the shape; negative offsets shrink it
     */
    offset(o: TFloat): Shape;
    /** Expands shape b by the given offset then subtracts it from shape a */
    clearance(b: TFloat, offset: TFloat): Shape;
    /** Returns a shell of a shape with the given offset */
    shell(offset: TFloat): Shape;
    /** Blends two shapes by the given amount using exponents */
    blendExpt(b: TFloat, m: TFloat): Shape;
    /**
     * Blends two shapes by the given amount using exponents,
     * with the blend term adjusted to produce results approximately
     * resembling blend_rough for values between 0 and 1.
     */
    blendExptUnit(b: TFloat, m: TFloat): Shape;
    /**
     * Blends two shapes by the given amount, using a fast-but-rough
     * CSG approximation that may not preserve gradients
     */
    blendRough(b: TFloat, m: TFloat): Shape;
    /**
     * Blends the subtraction of b, with optional offset o,
     * from a, with smoothness m
     */
    blendDifference(b: TFloat, m: TFloat, o?: TFloat): Shape;
    /**
     * Morphs between two shapes.
     * m = 0 produces a, m = 1 produces b
     */
    morph(b: TFloat, m: TFloat): Shape;
    /**
     * Produces a blended loft between a (at zmin) and b (at zmax)
     * a and b should be 2D shapes (i.e. invariant along the z axis)
     */
    loft(b: TFloat, zmin: TFloat, zmax: TFloat): Shape;
    /**
     * Produces a blended loft between a (at lower.z) and b (at upper.z),
     * with XY coordinates remapped to slide between lower.xy and upper.xy.
     * a and b should be 2D shapes (i.e. invariant along the z axis)
     */
    loftBetween(b: TFloat, lower: Vec3Arg, upper: Vec3Arg): Shape;
    /** Iterates a part in a 1D array */
    arrayX(nx: number, dx: TFloat): Shape;
    /** Iterates a part in a 2D array */
    arrayXY(nx: number, ny: number, delta: Vec2Arg): Shape;
    /** Iterates a part in a 3D array */
    arrayXYZ(nx: number, ny: number, nz: number, delta: Vec3Arg): Shape;
    /** Iterates a shape about an optional center position */
    arrayPolarZ(n: number, center?: Vec2Arg): Shape;
    /** Extrudes a 2D shape between zmin and zmax */
    extrudeZ(zmin: TFloat, zmax: TFloat): Shape;
    /** Moves the given shape in 2D or 3D space */
    move(offset: Vec3Arg): Shape;
    /** Reflects a shape about the x origin or an optional offset */
    reflectX(x0?: TFloat): Shape;
    /** Reflects a shape about the y origin or an optional offset */
    reflectY(y0?: TFloat): Shape;
    /** Reflects a shape about the z origin or an optional offset */
    reflectZ(z0?: TFloat): Shape;
    /** Reflects a shape about the plane X=Y */
    reflectXY(): Shape;
    /** Reflects a shape about the plane Y=Z */
    reflectYZ(): Shape;
    /** Reflects a shape about the plane X=Z */
    reflectXZ(): Shape;
    /**
     * Clips the given shape at the x origin, then duplicates the remaining
     * shape reflected on the other side of the origin
     */
    symmetricX(): Shape;
    /**
     * Clips the given shape at the y origin, then duplicates the remaining
     * shape reflected on the other side of the origin
     */
    symmetricY(): Shape;
    /**
     * Clips the given shape at the z origin, then duplicates the remaining
     * shape reflected on the other side of the origin
     */
    symmetricZ(): Shape;
    /** Scales a shape by sx on the x axis about 0 or an optional offset */
    scaleX(sx: TFloat, x0?: TFloat): Shape;
    /** Scales a shape by sx on the x axis about 0 or an optional offset */
    scaleY(sy: TFloat, y0?: TFloat): Shape;
    /** Scales a shape by sx on the x axis about 0 or an optional offset */
    scaleZ(sz: TFloat, z0?: TFloat): Shape;
    /** Scales a shape on all three axes, about 0 or an optional offset */
    scaleXYZ(s: Vec3Arg, center?: Vec3Arg): Shape;
    /**
     * Rotate the given shape by an angle in radians
     * The center of rotation is [0 0 0] or specified by the optional argument
     */
    rotateX(angle: TFloat, center?: Vec3Arg): Shape;
    /**
     * Rotate the given shape by an angle in radians
     * The center of rotation is [0 0 0] or specified by the optional argument
     */
    rotateY(angle: TFloat, center?: Vec3Arg): Shape;
    /**
     * Rotate the given shape by an angle in radians
     * The center of rotation is [0 0 0] or specified by the optional argument
     */
    rotateZ(angle: TFloat, center?: Vec3Arg): Shape;
    /**
     * Tapers a shape along the x axis as a function of y
     * width = base-scale at base
     * width = scale at base + [0 h]
     */
    taperXY(base: Vec2Arg, h: TFloat, scale: TFloat, baseScale?: TFloat): Shape;
    /**
     * Tapers a shape in the xy plane as a function of z
     * width = base-scale at base
     * width = scale at base + [0 0 height]
     */
    taperXYZ(base: Vec3Arg, height: TFloat, scale: TFloat, baseScale?: TFloat): Shape;
    /**
     * Shears a shape on the x axis as a function of y
     * offset = base-offset at base.y
     * offset = offset = base.y + h
     */
    shearXY(base: Vec2Arg, height: TFloat, offset: TFloat, baseOffset?: TFloat): Shape;
    /**
     * Repels the shape away from a point based upon a radius r,
     * with optional exaggeration
     */
    repel(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from a YZ plane based upon a radius r,
     * with optional exaggeration
     */
    repelX(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from a XZ plane based upon a radius r,
     * with optional exaggeration
     */
    repelY(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from a XY plane based upon a radius r,
     * with optional exaggeration
     */
    repelZ(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from line parallel to the Z axis,
     * with a particular radius and optional exaggeration
     */
    repelXY(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from line parallel to the X axis,
     * with a particular radius and optional exaggeration
     */
    repelYZ(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Repels the shape away from line parallel to the Y axis,
     * with a particular radius and optional exaggeration
     */
    repelXZ(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from a point based upon a radius r,
     * with optional exaggeration
     */
    attract(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from a YZ plane based upon a radius r,
     * with optional exaggeration
     */
    attractX(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from a XZ plane based upon a radius r,
     * with optional exaggeration
     */
    attractY(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from a XY plane based upon a radius r,
     * with optional exaggeration
     */
    attractZ(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from line parallel to the Z axis,
     * with a particular radius and optional exaggeration
     */
    attractXY(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from line parallel to the X axis,
     * with a particular radius and optional exaggeration
     */
    attractYZ(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Attracts the shape away from line parallel to the Y axis,
     * with a particular radius and optional exaggeration
     */
    attractXZ(locus: Vec3Arg, radius: TFloat, exaggerate?: TFloat): Shape;
    /**
     * Revolves a 2D (XY) shape about a line parallel to the Y axis with the
     * given x value
     */
    revolveY(x0?: TFloat): Shape;
    /** Twirls the shape in the x axis about the (optional) center point */
    twirlX(amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * Twirls the shape in the x axis about the line extending from the
     * (optional) center point
     */
    twirlAxisX(amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /** Twirls the shape in the y axis about the (optional) center point */
    twirlY(amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * Twirls the shape in the y axis about the line extending from the
     * (optional) center point
     */
    twirlAxisY(amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /** Twirls the shape in the z axis about the (optional) center point */
    twirlZ(amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * Twirls the shape in the z axis about the line extending from the
     * (optional) center point
     */
    twirlAxisZ(amount: TFloat, radius: TFloat, center?: Vec3Arg): Shape;
    /**
     * Blends two shapes by the given amount using exponents,
     * with the blend term adjusted to produce results approximately
     * resembling blend_rough for values between 0 and 1.
     * Alias of `blend`.
     */
    blend(b: TFloat, m: TFloat): Shape;
    /**
     * Iterates a shape about an optional center position
     * Alias of `arrayPolar`.
     */
    arrayPolar(n: number, center?: Vec2Arg): Shape;
    /**
     * Rotate the given shape by an angle in radians
     * The center of rotation is [0 0 0] or specified by the optional argument
     * Alias of `rotate`.
     */
    rotate(angle: TFloat, center?: Vec3Arg): Shape;
}
