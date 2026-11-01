/*
libfive-wasm: generated flat stdlib shims (AD-022, AD-024).

DO NOT EDIT BY HAND. Regenerate with `npm run gen:stdlib`
(scripts/gen-stdlib-shims.mjs) after vendoring a new libfive pin.

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

#pragma once

#include "libfive_stdlib.h"

#ifdef __cplusplus
extern "C" {
#endif

libfive_tree shim_stdlib_union(
    libfive_tree a,
    libfive_tree b);

libfive_tree shim_stdlib_intersection(
    libfive_tree a,
    libfive_tree b);

libfive_tree shim_stdlib_inverse(
    libfive_tree a);

libfive_tree shim_stdlib_difference(
    libfive_tree a,
    libfive_tree b);

libfive_tree shim_stdlib_offset(
    libfive_tree a,
    libfive_tree o);

libfive_tree shim_stdlib_clearance(
    libfive_tree a,
    libfive_tree b,
    libfive_tree offset);

libfive_tree shim_stdlib_shell(
    libfive_tree a,
    libfive_tree offset);

libfive_tree shim_stdlib_blend_expt(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m);

libfive_tree shim_stdlib_blend_expt_unit(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m);

libfive_tree shim_stdlib_blend_rough(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m);

libfive_tree shim_stdlib_blend_difference(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m,
    libfive_tree o);

libfive_tree shim_stdlib_morph(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m);

libfive_tree shim_stdlib_loft(
    libfive_tree a,
    libfive_tree b,
    libfive_tree zmin,
    libfive_tree zmax);

libfive_tree shim_stdlib_loft_between(
    libfive_tree a,
    libfive_tree b,
    libfive_tree lower_x,
    libfive_tree lower_y,
    libfive_tree lower_z,
    libfive_tree upper_x,
    libfive_tree upper_y,
    libfive_tree upper_z);

libfive_tree shim_stdlib_circle(
    libfive_tree r,
    libfive_tree center_x,
    libfive_tree center_y);

libfive_tree shim_stdlib_ring(
    libfive_tree ro,
    libfive_tree ri,
    libfive_tree center_x,
    libfive_tree center_y);

libfive_tree shim_stdlib_polygon(
    libfive_tree r,
    int n,
    libfive_tree center_x,
    libfive_tree center_y);

libfive_tree shim_stdlib_rectangle(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y);

libfive_tree shim_stdlib_rounded_rectangle(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree r);

libfive_tree shim_stdlib_rectangle_exact(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y);

libfive_tree shim_stdlib_rectangle_centered_exact(
    libfive_tree size_x,
    libfive_tree size_y,
    libfive_tree center_x,
    libfive_tree center_y);

libfive_tree shim_stdlib_triangle(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree c_x,
    libfive_tree c_y);

libfive_tree shim_stdlib_box_mitered(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree a_z,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree b_z);

libfive_tree shim_stdlib_box_mitered_centered(
    libfive_tree size_x,
    libfive_tree size_y,
    libfive_tree size_z,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_box_exact_centered(
    libfive_tree size_x,
    libfive_tree size_y,
    libfive_tree size_z,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_box_exact(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree a_z,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree b_z);

libfive_tree shim_stdlib_rounded_box(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree a_z,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree b_z,
    libfive_tree r);

libfive_tree shim_stdlib_sphere(
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_half_space(
    libfive_tree norm_x,
    libfive_tree norm_y,
    libfive_tree norm_z,
    libfive_tree point_x,
    libfive_tree point_y,
    libfive_tree point_z);

libfive_tree shim_stdlib_cylinder_z(
    libfive_tree r,
    libfive_tree h,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree base_z);

libfive_tree shim_stdlib_cone_ang_z(
    libfive_tree angle,
    libfive_tree height,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree base_z);

libfive_tree shim_stdlib_cone_z(
    libfive_tree radius,
    libfive_tree height,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree base_z);

libfive_tree shim_stdlib_pyramid_z(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree zmin,
    libfive_tree height);

libfive_tree shim_stdlib_torus_z(
    libfive_tree ro,
    libfive_tree ri,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_gyroid(
    libfive_tree period_x,
    libfive_tree period_y,
    libfive_tree period_z,
    libfive_tree thickness);

libfive_tree shim_stdlib_emptiness(
    void);

libfive_tree shim_stdlib_array_x(
    libfive_tree shape,
    int nx,
    libfive_tree dx);

libfive_tree shim_stdlib_array_xy(
    libfive_tree shape,
    int nx,
    int ny,
    libfive_tree delta_x,
    libfive_tree delta_y);

libfive_tree shim_stdlib_array_xyz(
    libfive_tree shape,
    int nx,
    int ny,
    int nz,
    libfive_tree delta_x,
    libfive_tree delta_y,
    libfive_tree delta_z);

libfive_tree shim_stdlib_array_polar_z(
    libfive_tree shape,
    int n,
    libfive_tree center_x,
    libfive_tree center_y);

libfive_tree shim_stdlib_extrude_z(
    libfive_tree t,
    libfive_tree zmin,
    libfive_tree zmax);

libfive_tree shim_stdlib_move(
    libfive_tree t,
    libfive_tree offset_x,
    libfive_tree offset_y,
    libfive_tree offset_z);

libfive_tree shim_stdlib_reflect_x(
    libfive_tree t,
    libfive_tree x0);

libfive_tree shim_stdlib_reflect_y(
    libfive_tree t,
    libfive_tree y0);

libfive_tree shim_stdlib_reflect_z(
    libfive_tree t,
    libfive_tree z0);

libfive_tree shim_stdlib_reflect_xy(
    libfive_tree t);

libfive_tree shim_stdlib_reflect_yz(
    libfive_tree t);

libfive_tree shim_stdlib_reflect_xz(
    libfive_tree t);

libfive_tree shim_stdlib_symmetric_x(
    libfive_tree t);

libfive_tree shim_stdlib_symmetric_y(
    libfive_tree t);

libfive_tree shim_stdlib_symmetric_z(
    libfive_tree t);

libfive_tree shim_stdlib_scale_x(
    libfive_tree t,
    libfive_tree sx,
    libfive_tree x0);

libfive_tree shim_stdlib_scale_y(
    libfive_tree t,
    libfive_tree sy,
    libfive_tree y0);

libfive_tree shim_stdlib_scale_z(
    libfive_tree t,
    libfive_tree sz,
    libfive_tree z0);

libfive_tree shim_stdlib_scale_xyz(
    libfive_tree t,
    libfive_tree s_x,
    libfive_tree s_y,
    libfive_tree s_z,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_rotate_x(
    libfive_tree t,
    libfive_tree angle,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_rotate_y(
    libfive_tree t,
    libfive_tree angle,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_rotate_z(
    libfive_tree t,
    libfive_tree angle,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_taper_x_y(
    libfive_tree shape,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree h,
    libfive_tree scale,
    libfive_tree base_scale);

libfive_tree shim_stdlib_taper_xy_z(
    libfive_tree shape,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree base_z,
    libfive_tree height,
    libfive_tree scale,
    libfive_tree base_scale);

libfive_tree shim_stdlib_shear_x_y(
    libfive_tree t,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree height,
    libfive_tree offset,
    libfive_tree base_offset);

libfive_tree shim_stdlib_repel(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_repel_x(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_repel_y(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_repel_z(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_repel_xy(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_repel_yz(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_repel_xz(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_attract(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_attract_x(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_attract_y(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_attract_z(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_attract_xy(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_attract_yz(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_attract_xz(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate);

libfive_tree shim_stdlib_revolve_y(
    libfive_tree shape,
    libfive_tree x0);

libfive_tree shim_stdlib_twirl_x(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_twirl_axis_x(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_twirl_y(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_twirl_axis_y(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_twirl_z(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_twirl_axis_z(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z);

libfive_tree shim_stdlib_text(
    const char* txt,
    libfive_tree pos_x,
    libfive_tree pos_y);

#ifdef __cplusplus
}
#endif
