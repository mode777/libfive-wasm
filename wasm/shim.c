/*
libfive-wasm: C ABI shims for JavaScript callers

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

#include "shim.h"

#include <stddef.h>

void shim_region3_set(libfive_region3* r,
                      float x_lower, float x_upper,
                      float y_lower, float y_upper,
                      float z_lower, float z_upper)
{
    r->X.lower = x_lower;
    r->X.upper = x_upper;
    r->Y.lower = y_lower;
    r->Y.upper = y_upper;
    r->Z.lower = z_lower;
    r->Z.upper = z_upper;
}

void shim_vec3_set(libfive_vec3* v, float x, float y, float z)
{
    v->x = x;
    v->y = y;
    v->z = z;
}

float shim_tree_eval_f(libfive_tree t, const libfive_vec3* p)
{
    return libfive_tree_eval_f(t, *p);
}

void shim_tree_eval_r(libfive_tree t, const libfive_region3* r,
                      libfive_interval* out)
{
    *out = libfive_tree_eval_r(t, *r);
}

void shim_tree_eval_d(libfive_tree t, const libfive_vec3* p,
                      libfive_vec3* out)
{
    *out = libfive_tree_eval_d(t, *p);
}

float shim_tree_get_const(libfive_tree t, int32_t* success)
{
    bool ok = false;
    float value = libfive_tree_get_const(t, &ok);
    if (success != NULL) {
        *success = ok ? 1 : 0;
    }
    return value;
}

libfive_mesh* shim_tree_render_mesh_st(libfive_tree t,
                                       const libfive_region3* r, float res)
{
    return libfive_tree_render_mesh_st(t, *r, res);
}

const libfive_vec3* shim_mesh_verts(const libfive_mesh* m)
{
    return m->verts;
}

const libfive_tri* shim_mesh_tris(const libfive_mesh* m)
{
    return m->tris;
}

uint32_t shim_mesh_vert_count(const libfive_mesh* m)
{
    return m->vert_count;
}

uint32_t shim_mesh_tri_count(const libfive_mesh* m)
{
    return m->tri_count;
}

libfive_evaluator shim_tree_evaluator(libfive_tree t,
                                      const libfive_vars* vars)
{
    return libfive_tree_evaluator(t, *vars);
}

int32_t shim_evaluator_update_vars(libfive_evaluator eval_tree,
                                   const libfive_vars* vars)
{
    return libfive_evaluator_update_vars(eval_tree, *vars) ? 1 : 0;
}
