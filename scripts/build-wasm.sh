#!/usr/bin/env bash
# scripts/build-wasm.sh — build dist/libfive.wasm from the pinned sources.
#
# The single build entry point CI calls (AD-019, AD-020, AD-022). It verifies
# the pinned inputs and toolchain, configures the vendored tree with the
# Emscripten toolchain, links the artifact with the v1 export surface, and runs
# the Node smoke + interval acceptance suites.
#
# Usage:
#   scripts/build-wasm.sh             release build + tests (CI default)
#   scripts/build-wasm.sh --debug     unoptimized build with assertions
#   scripts/build-wasm.sh --no-tests  skip the Node suites (local iteration)
#   scripts/build-wasm.sh --jobs N    compile parallelism (default: nproc)
#
# The release build also runs the golden mesh suite when dev dependencies are
# installed (`npm ci`). Goldens are captured only from the release artifact
# (AD-025); debug builds are not compared.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/vendor-common.sh
source "$SCRIPT_DIR/lib/vendor-common.sh"

readonly EMSDK_VERSION="3.1.64"
readonly EXPORT_MANIFEST="$REPO_ROOT/wasm/exports.txt"
readonly STDLIB_HEADER="$REPO_ROOT/vendor/libfive/libfive/stdlib/libfive_stdlib.h"
readonly STDLIB_SHIM_HEADER="$REPO_ROOT/wasm/stdlib_shim.h"
readonly STDLIB_SHIM_SOURCE="$REPO_ROOT/wasm/stdlib_shim.c"

FLAVOR=release
RUN_TESTS=1
JOBS=""
BUILD_DIR="$REPO_ROOT/build/wasm"
OUT_DIR="$REPO_ROOT/dist"

usage() {
    cat <<'EOF'
Usage: scripts/build-wasm.sh [--debug] [--no-tests] [--jobs N]

  --debug      Build the unoptimized flavor into dist/debug/.
  --no-tests   Skip the Node smoke and interval suites (local iteration only).
  --jobs N     Parallel compile jobs (default: nproc).

Requires Emscripten 3.1.64 on PATH (AD-013). On the verification server, run
`source /opt/emsdk/emsdk_env.sh` first, or set LIBFIVE_EMSDK_ENV to the env
script that should be sourced when emcc is not already available.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --debug)
            FLAVOR=debug
            BUILD_DIR="$REPO_ROOT/build/wasm-debug"
            OUT_DIR="$REPO_ROOT/dist/debug"
            ;;
        --no-tests) RUN_TESTS=0 ;;
        --jobs)
            [[ $# -ge 2 ]] || die "--jobs needs a value"
            JOBS="$2"
            shift
            ;;
        --jobs=*) JOBS="${1#--jobs=}" ;;
        -h | --help)
            usage
            exit 0
            ;;
        *)
            usage >&2
            die "unknown argument: $1"
            ;;
    esac
    shift
done

if [[ -z "$JOBS" ]]; then
    if command -v nproc >/dev/null 2>&1; then
        JOBS="$(nproc)"
    else
        JOBS=4
    fi
fi

# --------------------------------------------------------------------------
# Toolchain (AD-013: Emscripten 3.1.64, everywhere)
# --------------------------------------------------------------------------

if ! command -v emcc >/dev/null 2>&1 && [[ -n "${LIBFIVE_EMSDK_ENV:-}" ]]; then
    # shellcheck disable=SC1090
    source "$LIBFIVE_EMSDK_ENV"
fi

need_cmd emcc emcmake cmake node sha256sum awk

emcc_version="$(emcc --version | head -n 1)"
if [[ ! "$emcc_version" =~ (^|[^0-9.])${EMSDK_VERSION//./\\.}([^0-9.]|$) ]]; then
    die "Emscripten ${EMSDK_VERSION} is required (AD-013), but emcc reports:
  $emcc_version
Source the pinned SDK first (for example /opt/emsdk/emsdk_env.sh) or set
LIBFIVE_EMSDK_ENV to its env script."
fi

GENERATOR_ARGS=()
if command -v ninja >/dev/null 2>&1; then
    GENERATOR_ARGS=(-G Ninja)
fi

log "libfive-wasm build ($FLAVOR)"
info "toolchain: $emcc_version"

# --------------------------------------------------------------------------
# Pinned inputs (AD-016, AD-021)
# --------------------------------------------------------------------------

if [[ -d "$REPO_ROOT/vendor/libfive" ]]; then
    "$SCRIPT_DIR/vendor-libfive.sh" --check
else
    "$SCRIPT_DIR/vendor-libfive.sh"
fi

if [[ -d "$REPO_ROOT/build/deps/eigen" && -d "$REPO_ROOT/build/deps/boost" ]]; then
    "$SCRIPT_DIR/fetch-deps.sh" --check
else
    "$SCRIPT_DIR/fetch-deps.sh"
fi

# --------------------------------------------------------------------------
# Generated stdlib bindings (AD-017, AD-024): fail on drift, never build a
# surface that disagrees with the vendored header.
# --------------------------------------------------------------------------

log "checking generated stdlib bindings"
node "$SCRIPT_DIR/gen-stdlib-ts.mjs" --check
node "$SCRIPT_DIR/gen-stdlib-shims.mjs" --check

# --------------------------------------------------------------------------
# Configure and compile
# --------------------------------------------------------------------------

EIGEN_INCLUDE_DIRS="$REPO_ROOT/build/deps/eigen"
Boost_INCLUDE_DIRS="$REPO_ROOT/build/deps/boost"
LIBFIVE_WASM_INCLUDE_DIR="$REPO_ROOT/wasm/include"

if [[ "$FLAVOR" == debug ]]; then
    CMAKE_BUILD_TYPE=Debug
    ENABLE_DEBUG=ON
    LIBFIVE_WASM_DEBUG=ON
else
    CMAKE_BUILD_TYPE=Release
    ENABLE_DEBUG=OFF
    LIBFIVE_WASM_DEBUG=OFF
fi

# Reconfigure from scratch on flavor changes so the initial-cache values and
# compile flags never leak between release and debug trees.
if [[ -f "$BUILD_DIR/CMakeCache.txt" ]]; then
    cached_type="$(awk -F= '/^CMAKE_BUILD_TYPE:/ { print $2; exit }' "$BUILD_DIR/CMakeCache.txt")"
    if [[ "$cached_type" != "$CMAKE_BUILD_TYPE" ]]; then
        info "build type changed ($cached_type -> $CMAKE_BUILD_TYPE); reconfiguring"
        rm -rf "$BUILD_DIR"
    fi
fi

emcmake cmake -S "$REPO_ROOT/vendor/libfive" -B "$BUILD_DIR" \
    "${GENERATOR_ARGS[@]}" \
    -C "$SCRIPT_DIR/emcache.cmake" \
    -DCMAKE_PROJECT_INCLUDE="$SCRIPT_DIR/emvalidate.cmake" \
    -DCMAKE_BUILD_TYPE="$CMAKE_BUILD_TYPE" \
    -DENABLE_DEBUG="$ENABLE_DEBUG" \
    -DLIBFIVE_WASM_DEBUG="$LIBFIVE_WASM_DEBUG" \
    -DEIGEN_INCLUDE_DIRS="$EIGEN_INCLUDE_DIRS" \
    -DBoost_INCLUDE_DIRS="$Boost_INCLUDE_DIRS" \
    -DLIBFIVE_WASM_INCLUDE_DIR="$LIBFIVE_WASM_INCLUDE_DIR" \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON

cmake --build "$BUILD_DIR" --target libfive libfive-stdlib -j "$JOBS"

LIB_ARCHIVE="$(find "$BUILD_DIR" -type f -name 'libfive.a' -print -quit)"
STDLIB_ARCHIVE="$(find "$BUILD_DIR" -type f -name 'libfive-stdlib.a' -print -quit)"
[[ -n "$LIB_ARCHIVE" && -f "$LIB_ARCHIVE" ]] ||
    die "static libfive archive not found under $BUILD_DIR"
[[ -n "$STDLIB_ARCHIVE" && -f "$STDLIB_ARCHIVE" ]] ||
    die "static libfive-stdlib archive not found under $BUILD_DIR"

# --------------------------------------------------------------------------
# Export surface: manifest + every C stdlib function (AD-022)
# --------------------------------------------------------------------------

EXPORTS_FILE="$BUILD_DIR/exports.txt"

{
    sed -e 's/#.*//' "$EXPORT_MANIFEST" | awk 'NF { print $1 }'
    awk '
        /^[[:space:]]*LIBFIVE_STDLIB[[:space:]]+/ {
            line = $0
            sub(/^[[:space:]]*LIBFIVE_STDLIB[[:space:]]+/, "", line)
            sub(/\(.*/, "", line)
            gsub(/[[:space:]]/, "", line)
            if (line != "") print "_" line
        }
    ' "$STDLIB_HEADER"
    awk '
        /^libfive_tree shim_stdlib_[A-Za-z0-9_]+\(/ {
            line = $0
            sub(/\(.*/, "", line)
            sub(/^libfive_tree /, "", line)
            print "_" line
        }
    ' "$STDLIB_SHIM_HEADER"
} | sort -u > "$EXPORTS_FILE"

[[ -s "$EXPORTS_FILE" ]] || die "export list is empty"
grep -qx '_malloc' "$EXPORTS_FILE" || die "export list is missing _malloc"
grep -qx '_free' "$EXPORTS_FILE" || die "export list is missing _free"
grep -qx '_shim_stdlib_sphere' "$EXPORTS_FILE" ||
    die "export list is missing the generated stdlib shims"

LINK_ROOTS=()
while IFS= read -r symbol; do
    LINK_ROOTS+=("-Wl,--undefined=$symbol")
done < "$EXPORTS_FILE"

# --------------------------------------------------------------------------
# Link
# --------------------------------------------------------------------------

mkdir -p "$OUT_DIR"

OPT_FLAGS=(-O3 -flto)
ASSERTION_FLAGS=()
if [[ "$FLAVOR" == debug ]]; then
    OPT_FLAGS=(-O0)
    ASSERTION_FLAGS=(-sASSERTIONS=2)
fi

EMCC_FLAGS=(
    "${OPT_FLAGS[@]}"
    "${ASSERTION_FLAGS[@]}"
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sEXPORT_NAME=createLibfiveModule
    -sENVIRONMENT=web,node,worker
    -sALLOW_MEMORY_GROWTH=1
    -sINITIAL_MEMORY=67108864
    -sMAXIMUM_MEMORY=2147483648
    -sFILESYSTEM=0
    -sUSE_LIBPNG=1
    -fexceptions
    --no-entry
    "-sEXPORTED_FUNCTIONS=@$EXPORTS_FILE"
    "-sEXPORTED_RUNTIME_METHODS=HEAP8,HEAPU8,HEAP32,HEAPU32,HEAPF32,UTF8ToString,stringToUTF8,lengthBytesUTF8,getValue,setValue"
)

log "linking $OUT_DIR/libfive.js"
emcc \
    -I "$REPO_ROOT/wasm" \
    -I "$REPO_ROOT/vendor/libfive/libfive/include" \
    -I "$REPO_ROOT/vendor/libfive/libfive/stdlib" \
    "$REPO_ROOT/wasm/shim.c" \
    "$STDLIB_SHIM_SOURCE" \
    "$STDLIB_ARCHIVE" \
    "$LIB_ARCHIVE" \
    "${LINK_ROOTS[@]}" \
    "${EMCC_FLAGS[@]}" \
    -o "$OUT_DIR/libfive.js"

[[ -f "$OUT_DIR/libfive.wasm" ]] || die "link did not produce $OUT_DIR/libfive.wasm"
[[ -f "$OUT_DIR/libfive.js" ]] || die "link did not produce $OUT_DIR/libfive.js"

# --------------------------------------------------------------------------
# Package entry and declarations (AD-026). The debug flavor leaves dist/
# untouched; only the release artifact is packaged.
# --------------------------------------------------------------------------

if [[ "$FLAVOR" == release ]]; then
    if [[ ! -x "$REPO_ROOT/node_modules/.bin/tsc" ]] ||
        [[ ! -d "$REPO_ROOT/node_modules/esbuild" ]]; then
        die "package build tools are missing; run \`npm ci\` before building"
    fi
    log "building package entry and declarations"
    node "$SCRIPT_DIR/build-js.mjs"
fi

# --------------------------------------------------------------------------
# Acceptance tests
# --------------------------------------------------------------------------

if [[ "$RUN_TESTS" == 1 ]]; then
    log "running smoke test"
    node "$SCRIPT_DIR/test-smoke.mjs" \
        --glue "$OUT_DIR/libfive.js" --wasm "$OUT_DIR/libfive.wasm"
    log "running interval test"
    node "$SCRIPT_DIR/test-interval.mjs" \
        --glue "$OUT_DIR/libfive.js" --wasm "$OUT_DIR/libfive.wasm"

    # Golden meshes are captured from the release artifact only (AD-025);
    # the debug flavor is for local investigation and is not compared.
    if [[ "$FLAVOR" == release ]]; then
        if [[ -x "$REPO_ROOT/node_modules/.bin/vitest" ]]; then
            log "running golden mesh test"
            (
                cd "$REPO_ROOT"
                ./node_modules/.bin/vitest run tests/golden.test.ts
            )
        else
            warn "golden suite skipped (dev dependencies not installed; run npm ci)"
        fi
    fi
else
    warn "tests skipped (--no-tests); CI never uses this flag"
fi

# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------

digest="$(sha256sum "$OUT_DIR/libfive.wasm" | awk '{print $1}')"
size="$(wc -c <"$OUT_DIR/libfive.wasm" | awk '{print $1}')"
log "built $OUT_DIR/libfive.wasm ($size bytes)"
log "wasm-sha256: $digest"
