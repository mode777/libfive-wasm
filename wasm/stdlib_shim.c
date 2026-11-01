/*
libfive-wasm: generated flat stdlib shims (AD-022, AD-024).

DO NOT EDIT BY HAND. Regenerate with `npm run gen:stdlib`
(scripts/gen-stdlib-shims.mjs) after vendoring a new libfive pin.

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

#include "stdlib_shim.h"

#ifdef __cplusplus
extern "C" {
#endif

libfive_tree shim_stdlib_union(
    libfive_tree a,
    libfive_tree b)
{
    return _union(a, b);
}

libfive_tree shim_stdlib_intersection(
    libfive_tree a,
    libfive_tree b)
{
    return intersection(a, b);
}

libfive_tree shim_stdlib_inverse(
    libfive_tree a)
{
    return inverse(a);
}

libfive_tree shim_stdlib_difference(
    libfive_tree a,
    libfive_tree b)
{
    return difference(a, b);
}

libfive_tree shim_stdlib_offset(
    libfive_tree a,
    libfive_tree o)
{
    return offset(a, o);
}

libfive_tree shim_stdlib_clearance(
    libfive_tree a,
    libfive_tree b,
    libfive_tree offset)
{
    return clearance(a, b, offset);
}

libfive_tree shim_stdlib_shell(
    libfive_tree a,
    libfive_tree offset)
{
    return shell(a, offset);
}

libfive_tree shim_stdlib_blend_expt(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m)
{
    return blend_expt(a, b, m);
}

libfive_tree shim_stdlib_blend_expt_unit(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m)
{
    return blend_expt_unit(a, b, m);
}

libfive_tree shim_stdlib_blend_rough(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m)
{
    return blend_rough(a, b, m);
}

libfive_tree shim_stdlib_blend_difference(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m,
    libfive_tree o)
{
    return blend_difference(a, b, m, o);
}

libfive_tree shim_stdlib_morph(
    libfive_tree a,
    libfive_tree b,
    libfive_tree m)
{
    return morph(a, b, m);
}

libfive_tree shim_stdlib_loft(
    libfive_tree a,
    libfive_tree b,
    libfive_tree zmin,
    libfive_tree zmax)
{
    return loft(a, b, zmin, zmax);
}

libfive_tree shim_stdlib_loft_between(
    libfive_tree a,
    libfive_tree b,
    libfive_tree lower_x,
    libfive_tree lower_y,
    libfive_tree lower_z,
    libfive_tree upper_x,
    libfive_tree upper_y,
    libfive_tree upper_z)
{
    tvec3 lower = {lower_x, lower_y, lower_z};
    tvec3 upper = {upper_x, upper_y, upper_z};
    return loft_between(a, b, lower, upper);
}

libfive_tree shim_stdlib_circle(
    libfive_tree r,
    libfive_tree center_x,
    libfive_tree center_y)
{
    tvec2 center = {center_x, center_y};
    return circle(r, center);
}

libfive_tree shim_stdlib_ring(
    libfive_tree ro,
    libfive_tree ri,
    libfive_tree center_x,
    libfive_tree center_y)
{
    tvec2 center = {center_x, center_y};
    return ring(ro, ri, center);
}

libfive_tree shim_stdlib_polygon(
    libfive_tree r,
    int n,
    libfive_tree center_x,
    libfive_tree center_y)
{
    tvec2 center = {center_x, center_y};
    return polygon(r, n, center);
}

libfive_tree shim_stdlib_rectangle(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y)
{
    tvec2 a = {a_x, a_y};
    tvec2 b = {b_x, b_y};
    return rectangle(a, b);
}

libfive_tree shim_stdlib_rounded_rectangle(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree r)
{
    tvec2 a = {a_x, a_y};
    tvec2 b = {b_x, b_y};
    return rounded_rectangle(a, b, r);
}

libfive_tree shim_stdlib_rectangle_exact(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y)
{
    tvec2 a = {a_x, a_y};
    tvec2 b = {b_x, b_y};
    return rectangle_exact(a, b);
}

libfive_tree shim_stdlib_rectangle_centered_exact(
    libfive_tree size_x,
    libfive_tree size_y,
    libfive_tree center_x,
    libfive_tree center_y)
{
    tvec2 size = {size_x, size_y};
    tvec2 center = {center_x, center_y};
    return rectangle_centered_exact(size, center);
}

libfive_tree shim_stdlib_triangle(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree c_x,
    libfive_tree c_y)
{
    tvec2 a = {a_x, a_y};
    tvec2 b = {b_x, b_y};
    tvec2 c = {c_x, c_y};
    return triangle(a, b, c);
}

libfive_tree shim_stdlib_box_mitered(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree a_z,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree b_z)
{
    tvec3 a = {a_x, a_y, a_z};
    tvec3 b = {b_x, b_y, b_z};
    return box_mitered(a, b);
}

libfive_tree shim_stdlib_box_mitered_centered(
    libfive_tree size_x,
    libfive_tree size_y,
    libfive_tree size_z,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 size = {size_x, size_y, size_z};
    tvec3 center = {center_x, center_y, center_z};
    return box_mitered_centered(size, center);
}

libfive_tree shim_stdlib_box_exact_centered(
    libfive_tree size_x,
    libfive_tree size_y,
    libfive_tree size_z,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 size = {size_x, size_y, size_z};
    tvec3 center = {center_x, center_y, center_z};
    return box_exact_centered(size, center);
}

libfive_tree shim_stdlib_box_exact(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree a_z,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree b_z)
{
    tvec3 a = {a_x, a_y, a_z};
    tvec3 b = {b_x, b_y, b_z};
    return box_exact(a, b);
}

libfive_tree shim_stdlib_rounded_box(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree a_z,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree b_z,
    libfive_tree r)
{
    tvec3 a = {a_x, a_y, a_z};
    tvec3 b = {b_x, b_y, b_z};
    return rounded_box(a, b, r);
}

libfive_tree shim_stdlib_sphere(
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return sphere(radius, center);
}

libfive_tree shim_stdlib_half_space(
    libfive_tree norm_x,
    libfive_tree norm_y,
    libfive_tree norm_z,
    libfive_tree point_x,
    libfive_tree point_y,
    libfive_tree point_z)
{
    tvec3 norm = {norm_x, norm_y, norm_z};
    tvec3 point = {point_x, point_y, point_z};
    return half_space(norm, point);
}

libfive_tree shim_stdlib_cylinder_z(
    libfive_tree r,
    libfive_tree h,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree base_z)
{
    tvec3 base = {base_x, base_y, base_z};
    return cylinder_z(r, h, base);
}

libfive_tree shim_stdlib_cone_ang_z(
    libfive_tree angle,
    libfive_tree height,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree base_z)
{
    tvec3 base = {base_x, base_y, base_z};
    return cone_ang_z(angle, height, base);
}

libfive_tree shim_stdlib_cone_z(
    libfive_tree radius,
    libfive_tree height,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree base_z)
{
    tvec3 base = {base_x, base_y, base_z};
    return cone_z(radius, height, base);
}

libfive_tree shim_stdlib_pyramid_z(
    libfive_tree a_x,
    libfive_tree a_y,
    libfive_tree b_x,
    libfive_tree b_y,
    libfive_tree zmin,
    libfive_tree height)
{
    tvec2 a = {a_x, a_y};
    tvec2 b = {b_x, b_y};
    return pyramid_z(a, b, zmin, height);
}

libfive_tree shim_stdlib_torus_z(
    libfive_tree ro,
    libfive_tree ri,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return torus_z(ro, ri, center);
}

libfive_tree shim_stdlib_gyroid(
    libfive_tree period_x,
    libfive_tree period_y,
    libfive_tree period_z,
    libfive_tree thickness)
{
    tvec3 period = {period_x, period_y, period_z};
    return gyroid(period, thickness);
}

libfive_tree shim_stdlib_emptiness(
    void)
{
    return emptiness();
}

libfive_tree shim_stdlib_array_x(
    libfive_tree shape,
    int nx,
    libfive_tree dx)
{
    return array_x(shape, nx, dx);
}

libfive_tree shim_stdlib_array_xy(
    libfive_tree shape,
    int nx,
    int ny,
    libfive_tree delta_x,
    libfive_tree delta_y)
{
    tvec2 delta = {delta_x, delta_y};
    return array_xy(shape, nx, ny, delta);
}

libfive_tree shim_stdlib_array_xyz(
    libfive_tree shape,
    int nx,
    int ny,
    int nz,
    libfive_tree delta_x,
    libfive_tree delta_y,
    libfive_tree delta_z)
{
    tvec3 delta = {delta_x, delta_y, delta_z};
    return array_xyz(shape, nx, ny, nz, delta);
}

libfive_tree shim_stdlib_array_polar_z(
    libfive_tree shape,
    int n,
    libfive_tree center_x,
    libfive_tree center_y)
{
    tvec2 center = {center_x, center_y};
    return array_polar_z(shape, n, center);
}

libfive_tree shim_stdlib_extrude_z(
    libfive_tree t,
    libfive_tree zmin,
    libfive_tree zmax)
{
    return extrude_z(t, zmin, zmax);
}

libfive_tree shim_stdlib_move(
    libfive_tree t,
    libfive_tree offset_x,
    libfive_tree offset_y,
    libfive_tree offset_z)
{
    tvec3 offset = {offset_x, offset_y, offset_z};
    return move(t, offset);
}

libfive_tree shim_stdlib_reflect_x(
    libfive_tree t,
    libfive_tree x0)
{
    return reflect_x(t, x0);
}

libfive_tree shim_stdlib_reflect_y(
    libfive_tree t,
    libfive_tree y0)
{
    return reflect_y(t, y0);
}

libfive_tree shim_stdlib_reflect_z(
    libfive_tree t,
    libfive_tree z0)
{
    return reflect_z(t, z0);
}

libfive_tree shim_stdlib_reflect_xy(
    libfive_tree t)
{
    return reflect_xy(t);
}

libfive_tree shim_stdlib_reflect_yz(
    libfive_tree t)
{
    return reflect_yz(t);
}

libfive_tree shim_stdlib_reflect_xz(
    libfive_tree t)
{
    return reflect_xz(t);
}

libfive_tree shim_stdlib_symmetric_x(
    libfive_tree t)
{
    return symmetric_x(t);
}

libfive_tree shim_stdlib_symmetric_y(
    libfive_tree t)
{
    return symmetric_y(t);
}

libfive_tree shim_stdlib_symmetric_z(
    libfive_tree t)
{
    return symmetric_z(t);
}

libfive_tree shim_stdlib_scale_x(
    libfive_tree t,
    libfive_tree sx,
    libfive_tree x0)
{
    return scale_x(t, sx, x0);
}

libfive_tree shim_stdlib_scale_y(
    libfive_tree t,
    libfive_tree sy,
    libfive_tree y0)
{
    return scale_y(t, sy, y0);
}

libfive_tree shim_stdlib_scale_z(
    libfive_tree t,
    libfive_tree sz,
    libfive_tree z0)
{
    return scale_z(t, sz, z0);
}

libfive_tree shim_stdlib_scale_xyz(
    libfive_tree t,
    libfive_tree s_x,
    libfive_tree s_y,
    libfive_tree s_z,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 s = {s_x, s_y, s_z};
    tvec3 center = {center_x, center_y, center_z};
    return scale_xyz(t, s, center);
}

libfive_tree shim_stdlib_rotate_x(
    libfive_tree t,
    libfive_tree angle,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return rotate_x(t, angle, center);
}

libfive_tree shim_stdlib_rotate_y(
    libfive_tree t,
    libfive_tree angle,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return rotate_y(t, angle, center);
}

libfive_tree shim_stdlib_rotate_z(
    libfive_tree t,
    libfive_tree angle,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return rotate_z(t, angle, center);
}

libfive_tree shim_stdlib_taper_x_y(
    libfive_tree shape,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree h,
    libfive_tree scale,
    libfive_tree base_scale)
{
    tvec2 base = {base_x, base_y};
    return taper_x_y(shape, base, h, scale, base_scale);
}

libfive_tree shim_stdlib_taper_xy_z(
    libfive_tree shape,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree base_z,
    libfive_tree height,
    libfive_tree scale,
    libfive_tree base_scale)
{
    tvec3 base = {base_x, base_y, base_z};
    return taper_xy_z(shape, base, height, scale, base_scale);
}

libfive_tree shim_stdlib_shear_x_y(
    libfive_tree t,
    libfive_tree base_x,
    libfive_tree base_y,
    libfive_tree height,
    libfive_tree offset,
    libfive_tree base_offset)
{
    tvec2 base = {base_x, base_y};
    return shear_x_y(t, base, height, offset, base_offset);
}

libfive_tree shim_stdlib_repel(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return repel(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_repel_x(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return repel_x(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_repel_y(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return repel_y(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_repel_z(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return repel_z(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_repel_xy(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return repel_xy(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_repel_yz(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return repel_yz(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_repel_xz(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return repel_xz(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_attract(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return attract(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_attract_x(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return attract_x(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_attract_y(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return attract_y(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_attract_z(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return attract_z(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_attract_xy(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return attract_xy(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_attract_yz(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return attract_yz(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_attract_xz(
    libfive_tree shape,
    libfive_tree locus_x,
    libfive_tree locus_y,
    libfive_tree locus_z,
    libfive_tree radius,
    libfive_tree exaggerate)
{
    tvec3 locus = {locus_x, locus_y, locus_z};
    return attract_xz(shape, locus, radius, exaggerate);
}

libfive_tree shim_stdlib_revolve_y(
    libfive_tree shape,
    libfive_tree x0)
{
    return revolve_y(shape, x0);
}

libfive_tree shim_stdlib_twirl_x(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return twirl_x(shape, amount, radius, center);
}

libfive_tree shim_stdlib_twirl_axis_x(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return twirl_axis_x(shape, amount, radius, center);
}

libfive_tree shim_stdlib_twirl_y(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return twirl_y(shape, amount, radius, center);
}

libfive_tree shim_stdlib_twirl_axis_y(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return twirl_axis_y(shape, amount, radius, center);
}

libfive_tree shim_stdlib_twirl_z(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return twirl_z(shape, amount, radius, center);
}

libfive_tree shim_stdlib_twirl_axis_z(
    libfive_tree shape,
    libfive_tree amount,
    libfive_tree radius,
    libfive_tree center_x,
    libfive_tree center_y,
    libfive_tree center_z)
{
    tvec3 center = {center_x, center_y, center_z};
    return twirl_axis_z(shape, amount, radius, center);
}

libfive_tree shim_stdlib_text(
    const char* txt,
    libfive_tree pos_x,
    libfive_tree pos_y)
{
    tvec2 pos = {pos_x, pos_y};
    return text(txt, pos);
}

#ifdef __cplusplus
}
#endif
