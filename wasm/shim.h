/*
libfive-wasm: C ABI shims for JavaScript callers

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

#pragma once

#include <stdint.h>

#include "libfive.h"

#ifdef __cplusplus
extern "C" {
#endif

/*
 *  Struct builders. JavaScript has no struct-by-value arguments, so callers
 *  allocate the struct in wasm memory and fill it through these helpers.
 */
void shim_region3_set(libfive_region3* r,
                      float x_lower, float x_upper,
                      float y_lower, float y_upper,
                      float z_lower, float z_upper);
void shim_vec3_set(libfive_vec3* v, float x, float y, float z);

/*
 *  Evaluation wrappers: out-pointers for struct returns, pointers for
 *  struct-by-value parameters (see wasm/README.md).
 */
float shim_tree_eval_f(libfive_tree t, const libfive_vec3* p);
void shim_tree_eval_r(libfive_tree t, const libfive_region3* r,
                      libfive_interval* out);
void shim_tree_eval_d(libfive_tree t, const libfive_vec3* p,
                      libfive_vec3* out);

/*
 *  libfive_tree_get_const takes a bool* out-parameter; JavaScript sees a
 *  32-bit slot here.
 */
float shim_tree_get_const(libfive_tree t, int32_t* success);

/*
 *  Meshing is single-threaded (AD-014): only the _st entry point is exposed.
 */
libfive_mesh* shim_tree_render_mesh_st(libfive_tree t,
                                       const libfive_region3* r, float res);

const libfive_vec3* shim_mesh_verts(const libfive_mesh* m);
const libfive_tri* shim_mesh_tris(const libfive_mesh* m);
uint32_t shim_mesh_vert_count(const libfive_mesh* m);
uint32_t shim_mesh_tri_count(const libfive_mesh* m);

/*
 *  Evaluator wrappers: libfive_vars is passed by value by the C API.
 */
libfive_evaluator shim_tree_evaluator(libfive_tree t,
                                      const libfive_vars* vars);
int32_t shim_evaluator_update_vars(libfive_evaluator eval_tree,
                                   const libfive_vars* vars);

#ifdef __cplusplus
}
#endif
