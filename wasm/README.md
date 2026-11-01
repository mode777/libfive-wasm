# `wasm/` — artifact glue and frozen ABI

Everything in this directory belongs to the WebAssembly artifact (AD-004,
AD-022). The JavaScript package (roadmap item 3) binds against exactly what is
listed here; changing it is an ABI change and must be reviewed as one.

| File | Purpose |
|---|---|
| `shim.c`, `shim.h` | Handwritten C ABI flattening for the core API |
| `stdlib_shim.c`, `stdlib_shim.h` | **Generated** flat wrappers for every C stdlib declaration (AD-024) |
| `exports.txt` | Core + shim export manifest; stdlib and generated shim symbols are appended at build time |
| `include/libfive_wasm/interval_rounding.hpp` | Software interval rounding policy (AD-015, AD-023) |
| `../scripts/build-wasm.sh` | The single build entry point |
| `../scripts/emcache.cmake` | CMake initial-cache overlay for the Emscripten configure |
| `../scripts/emvalidate.cmake` | Post-`project()` include-root validation and flavor flags |

## Pointer conventions

The artifact is 32-bit WebAssembly. Every pointer that crosses into JavaScript
is an unsigned 32-bit wasm offset (`i32` in the export table), and every
`size_t`-shaped value is 32 bits. JavaScript reads memory through the
module's exported heap views (`HEAPU8`, `HEAP32`, `HEAPU32`, `HEAPF32`) after
looking the pointer up with `_malloc`.

## Export surface

`exports.txt` names the core C API and shim symbols with the leading
underscore that Emscripten uses in `EXPORTED_FUNCTIONS`. At link time
`scripts/build-wasm.sh` also appends every `LIBFIVE_STDLIB` function from the
vendored `libfive_stdlib.h` and every `_shim_stdlib_*` wrapper declared in
`wasm/stdlib_shim.h`, and passes each symbol as a link root
(`-Wl,--undefined=…`), so archive members that define exports are always
pulled in. The curated core manifest itself stays unchanged; the typed
`libfive.raw` namespace does not include stdlib symbols (AD-011).

With `-O3`, Emscripten minifies the raw WebAssembly export names; the generated
ES6 glue re-exposes the documented names as `Module._libfive_…` /
`Module._shim_…`. That module namespace is the contract (and what the smoke test
checks); `WebAssembly.Module.exports` is an implementation detail of the glue.

Deliberately **not** exported in v1 (per `architecture.md` and AD-018):

- `libfive_tree_render_mesh` — the threaded entry point; use the `_st` shim
  (AD-014)
- `libfive_tree_render_mesh_coords` — also threaded, and not part of the v1
  mesh surface
- `libfive_tree_render_slice*`, `libfive_tree_render_pixels` — slices/pixels
  are a later change
- `libfive_tree_save*`, `libfive_tree_load`, `libfive_evaluator_save_mesh` —
  file-based APIs are unavailable with `FILESYSTEM=0`
- `libfive_git_*` — build metadata, not part of the kernel surface
- `libfive_contours*`, `libfive_pixels*` — follow the slice/pixel work

## Struct-by-value and struct-return shims

JavaScript cannot pass or receive C structs by value, so the shim layer
flattens those signatures:

| Shim | Original shape | JS-facing shape |
|---|---|---|
| `shim_region3_set` | — | six floats fill a `libfive_region3` in wasm memory |
| `shim_vec3_set` | — | three floats fill a `libfive_vec3` |
| `shim_tree_eval_f` | `libfive_vec3` by value | `const libfive_vec3*` |
| `shim_tree_eval_r` | returns `libfive_interval` by value | writes through `libfive_interval*` |
| `shim_tree_eval_d` | takes and returns `libfive_vec3` by value | pointer in, out-pointer |
| `shim_tree_get_const` | `bool*` out-parameter | `int32_t*` out-parameter (0/1) |
| `shim_tree_render_mesh_st` | `libfive_region3` by value | `const libfive_region3*` |
| `shim_tree_evaluator` | `libfive_vars` by value | `const libfive_vars*` |
| `shim_evaluator_update_vars` | `libfive_vars` by value, `bool` result | pointer parameter, `int32_t` result |

## Mesh accessors and lifetimes

`libfive_mesh` is a wasm allocation owning the vertex and triangle arrays.
`shim_mesh_verts`, `shim_mesh_tris`, `shim_mesh_vert_count` and
`shim_mesh_tri_count` read its fields without exposing C struct offsets to
JavaScript. Vertices are `libfive_vec3` (`float x, y, z`, tightly packed);
triangles are `libfive_tri` (`uint32_t a, b, c`).

Views created over those arrays are valid until `_libfive_mesh_delete(mesh)`.
Because the wasm heap can grow and relocate, consumers must re-create views
from the current `HEAP*` buffer on each access rather than caching an
`ArrayBuffer` (the `Mesh` wrapper in the package does exactly this, AD-006).

## Generated flat stdlib shims (AD-024)

The C stdlib's `tvec2`/`tvec3` by-value signatures cannot cross into
JavaScript, so `scripts/gen-stdlib-shims.mjs` emits one wrapper per
`LIBFIVE_STDLIB` declaration into `wasm/stdlib_shim.{h,c}`. Every wrapper is
named `shim_stdlib_<name>` (C `_union` → `shim_stdlib_union`) and flattens the
signature: `libfive_tree`/`tfloat` → one tree handle, `tvec2` → two, `tvec3` →
three, `int` → `int`, `const char*` → pointer. The wrapper builds the local C
struct and calls the real symbol. `LIBFIVE_ALIAS` names are resolved in
TypeScript to their target declaration, so they get no C wrapper.

The generated files are checked in and deterministic. Both they and
`src/gen/stdlib.ts` are byte-compared against a fresh parse of the vendored
header by `scripts/build-wasm.sh`, which fails with the stale file names when a
pin bump was not regenerated (`npm run gen:stdlib`).

Strings: `shim_stdlib_text` takes a pointer. The TypeScript layer encodes one
byte per character in U+0000–U+00FF (Latin-1, matching the kernel's
byte-oriented font and upstream's Python bindings), writes a NUL-terminated
copy into wasm memory, calls the shim, and frees the buffer; the kernel parses
the string into a tree synchronously, so no pointer survives the call.

## Interval rounding

The kernel is compiled with the software policy in
`include/libfive_wasm/interval_rounding.hpp` (AD-015, AD-023). Interval
arithmetic evaluates in double precision and widens each result outward with
`std::nextafter`; no `fesetround`/`fegetround` call is compiled into the
artifact. `scripts/test-interval.mjs` is the acceptance suite for this policy.
