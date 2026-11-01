# scripts/emcache.cmake — CMake initial-cache overlay for the wasm build.
#
# Loaded by scripts/build-wasm.sh through `emcmake cmake -C`. It fixes the
# build shape for the pinned, Emscripten-hosted configure. Values that depend
# on command-line -D variables are handled by scripts/emvalidate.cmake, because
# CMake processes the initial cache before -D entries.
#
# See docs/build-system.md and AD-022.

# Emscripten links static archives into one module (AD-022); the MPL-only
# targets are already trimmed by the vendoring script (AD-001).
set(LIBFIVE_LIBRARY_TYPE STATIC CACHE STRING
    "Library type for libfive and libfive-stdlib" FORCE)

set(BUILD_TESTS OFF CACHE BOOL "Build test suite" FORCE)
set(BUILD_GUILE_BINDINGS OFF CACHE BOOL "Build Guile bindings" FORCE)
set(BUILD_PYTHON_BINDINGS OFF CACHE BOOL "Build Python bindings" FORCE)
set(BUILD_STUDIO_APP OFF CACHE BOOL "Build Studio application" FORCE)

# Keep C++ error paths intact (architecture.md); libpng arrives through the
# Emscripten port for the one compile unit that includes png.h (AD-016).
set(CMAKE_C_FLAGS "-fexceptions -sUSE_LIBPNG=1" CACHE STRING
    "libfive-wasm C flags" FORCE)
set(CMAKE_CXX_FLAGS "-fexceptions -sUSE_LIBPNG=1" CACHE STRING
    "libfive-wasm C++ flags" FORCE)
