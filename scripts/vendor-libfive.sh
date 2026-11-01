#!/usr/bin/env bash
# scripts/vendor-libfive.sh — recreate vendor/libfive from the pinned archive.
#
# Implements AD-016 (vendored, pinned libfive with carried patches) and AD-021
# (generated tree, digest-pinned acquisition, MPL-only scope). See
# vendor/VENDOR.md for the pin, the trim list, and the bump procedure.
#
# Usage:
#   scripts/vendor-libfive.sh            recreate if missing, verify if present
#   scripts/vendor-libfive.sh --force    rebuild from the archive (cache first)
#   scripts/vendor-libfive.sh --check    verify the existing tree, write nothing
#
# Exit status is non-zero on any pin, integrity, scope, patch, or digest
# failure. Nothing is installed unless every check passes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/vendor-common.sh
source "$SCRIPT_DIR/lib/vendor-common.sh"

readonly LOCK_FILE="$REPO_ROOT/vendor/libfive.lock"
readonly VENDOR_MD="$REPO_ROOT/vendor/VENDOR.md"
readonly LICENSE_SRC="$REPO_ROOT/vendor/LICENSE.mpl-2.0"
readonly PATCH_DIR="$REPO_ROOT/vendor/patches"
readonly TARGET_DIR="$REPO_ROOT/vendor/libfive"
readonly CACHE_DIR="$CACHE_ROOT/libfive"

# Top-level archive entries that survive trimming (design D4). Anything else is
# removed before patches are applied, so GPL or non-build subtrees cannot reach
# a build even if upstream adds them.
readonly KEEP_TOP_LEVEL=(CMakeLists.txt README.md CHANGELOG.md libfive)
# Entries inside libfive/ that are not part of the MPL-2.0 port.
readonly DROP_IN_LIBFIVE=(bind test)
# Paths that must never exist in the vendored tree (scope guard, AD-001).
readonly DENY_PATHS=(studio libfive/bind libfive/test doc bin .github .git)
# Paths the vendored tree must provide (spec: MPL-only vendored scope).
readonly REQUIRED_PATHS=(
    CMakeLists.txt
    LICENSE
    libfive/include/libfive.h
    libfive/include/libfive
    libfive/stdlib/libfive_stdlib.h
)

MODE=run

usage() {
    cat <<'EOF'
Usage: scripts/vendor-libfive.sh [--force | --check]

  (no option)  Create vendor/libfive if absent, otherwise verify it.
  --force      Rebuild vendor/libfive from the pinned archive (cache first).
  --check      Verify the existing tree only; never writes or downloads.
EOF
}

log_mode() {
    case "$MODE" in
        run) log "Vendoring libfive (pin: $(lock_get commit))" ;;
        force) log "Re-vendoring libfive (forced, pin: $(lock_get commit))" ;;
        check) log "Checking vendored libfive (pin: $(lock_get commit))" ;;
    esac
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --force) MODE=force ;;
        --check) MODE=check ;;
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

need_cmd tar sha256sum awk find cmp

[[ -f "$LOCK_FILE" ]] || die "missing pin file: $LOCK_FILE"

# --------------------------------------------------------------------------
# Pin metadata
# --------------------------------------------------------------------------

# lock_get <key> — read one flat key=value record from vendor/libfive.lock.
lock_get() {
    awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$LOCK_FILE"
}

REQUIRED_KEYS=(
    repository_url commit commit_date archive_url archive_sha256
    archive_size archive_root patches patch_digest
)

for key in "${REQUIRED_KEYS[@]}"; do
    value="$(lock_get "$key")"
    [[ -n "$value" ]] || die "lock file is missing required key: $key"
done

COMMIT="$(lock_get commit)"
ARCHIVE_URL="$(lock_get archive_url)"
ARCHIVE_SHA="$(lock_get archive_sha256)"
ARCHIVE_SIZE="$(lock_get archive_size)"
ARCHIVE_ROOT="$(lock_get archive_root)"
PATCH_LIST="$(lock_get patches)"
LOCK_PATCH_DIGEST="$(lock_get patch_digest)"
ARCHIVE_NAME="libfive-$COMMIT.tar.gz"

[[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]] ||
    die "lock commit is not a full 40-character SHA: $COMMIT"
[[ "$ARCHIVE_SHA" =~ ^[0-9a-f]{64}$ ]] ||
    die "lock archive_sha256 is not a SHA-256: $ARCHIVE_SHA"
[[ "$ARCHIVE_SIZE" =~ ^[0-9]+$ ]] ||
    die "lock archive_size is not a number: $ARCHIVE_SIZE"

# The human-readable record must agree with the pin (spec: pin mismatch is
# detectable). VENDOR.md is required, not optional documentation.
[[ -f "$VENDOR_MD" ]] || die "missing vendor note: $VENDOR_MD"
grep -qF "$COMMIT" "$VENDOR_MD" ||
    die "vendor/VENDOR.md does not name the pinned commit $COMMIT; update it before vendoring"

# The patch set is ordered by the lock, not by directory order, and the lock
# must match the directory exactly in both directions.
read -r -a PATCH_NAMES <<<"$PATCH_LIST"
[[ ${#PATCH_NAMES[@]} -gt 0 ]] || die "lock lists no patches"

for name in "${PATCH_NAMES[@]}"; do
    [[ "$name" != */* ]] || die "patch name must be a bare file name: $name"
    [[ -f "$PATCH_DIR/$name" ]] || die "patch listed in lock but missing: vendor/patches/$name"
done

if [[ -d "$PATCH_DIR" ]]; then
    for candidate in "$PATCH_DIR"/*.patch; do
        [[ -e "$candidate" ]] || continue
        base="$(basename "$candidate")"
        listed=false
        for name in "${PATCH_NAMES[@]}"; do
            [[ "$name" == "$base" ]] && listed=true
        done
        [[ "$listed" == true ]] ||
            die "vendor/patches/$base is not listed in vendor/libfive.lock (add it or remove it)"
    done
fi

compute_patch_digest() {
    local name
    for name in "${PATCH_NAMES[@]}"; do
        printf '%s  %s\n' "$(sha256_file "$PATCH_DIR/$name")" "$name"
    done | sha256sum | awk '{print $1}'
}

actual_patch_digest="$(compute_patch_digest)"
[[ "$actual_patch_digest" == "$LOCK_PATCH_DIGEST" ]] ||
    die "patch digest mismatch (lock $LOCK_PATCH_DIGEST, actual $actual_patch_digest); update vendor/libfive.lock after editing patches"

# --------------------------------------------------------------------------
# Expected tree state
# --------------------------------------------------------------------------

# expected_tree_digest — the recorded digest from vendor/VENDOR.md, if any.
expected_tree_digest() {
    awk '/^tree-sha256:/ { print $2; exit }' "$VENDOR_MD"
}

EXPECTED_DIGEST="$(expected_tree_digest)"

tree_problems() {
    local tree=$1 path
    for path in "${DENY_PATHS[@]}"; do
        [[ ! -e "$tree/$path" ]] || printf 'excluded path present: %s\n' "$path"
    done
    for path in "${REQUIRED_PATHS[@]}"; do
        [[ -e "$tree/$path" ]] || printf 'missing required path: %s\n' "$path"
    done
    if [[ -f "$tree/LICENSE" ]]; then
        cmp -s "$tree/LICENSE" "$LICENSE_SRC" ||
            printf 'LICENSE does not match vendor/LICENSE.mpl-2.0\n'
    fi
}

report_problems() {
    local tree=$1 problems
    problems="$(tree_problems "$tree")"
    [[ -z "$problems" ]] || die "vendored tree is invalid:
$problems"
}

verify_current() {
    local digest
    report_problems "$TARGET_DIR"
    digest="$(tree_digest "$TARGET_DIR")"
    [[ -n "$EXPECTED_DIGEST" ]] ||
        die "vendor/VENDOR.md has no tree-sha256 line; record the expected digest there"
    [[ "$digest" == "$EXPECTED_DIGEST" ]] ||
        die "vendored tree digest $digest does not match recorded $EXPECTED_DIGEST (run --force to rebuild, or update VENDOR.md if the pin changed)"
    log "vendor/libfive is current (tree-sha256: $digest)"
}

# --------------------------------------------------------------------------
# Patch application
# --------------------------------------------------------------------------

apply_patch() {
    local tree=$1 patch=$2
    (
        cd "$tree" &&
            patch -p1 --batch --forward --no-backup-if-mismatch \
                --fuzz=0 --silent --input "$patch"
    ) || die "patch failed to apply cleanly: $(basename "$patch")"
}

apply_patch_set() {
    local tree=$1 quiet=${2:-0} name
    for name in "${PATCH_NAMES[@]}"; do
        apply_patch "$tree" "$PATCH_DIR/$name"
        [[ "$quiet" == 1 ]] || info "applied patch: $name"
    done
    reject_leftovers "$tree"
}

# --------------------------------------------------------------------------
# Modes
# --------------------------------------------------------------------------

if [[ "$MODE" == check ]]; then
    log_mode
    [[ -d "$TARGET_DIR" ]] || die "no vendored tree at vendor/libfive; run scripts/vendor-libfive.sh"
    verify_current
    exit 0
fi

if [[ "$MODE" == run && -d "$TARGET_DIR" ]]; then
    log_mode
    verify_current
    exit 0
fi

log_mode

cached_download "$ARCHIVE_URL" "$ARCHIVE_SHA" "$CACHE_DIR" "$ARCHIVE_NAME"

archive_size="$(wc -c <"$CACHED_ARCHIVE" | awk '{print $1}')"
[[ "$archive_size" == "$ARCHIVE_SIZE" ]] ||
    die "archive size mismatch: expected $ARCHIVE_SIZE bytes, got $archive_size"

listing="$(tar -tzf "$CACHED_ARCHIVE")" ||
    die "cannot read archive listing: $CACHED_ARCHIVE"

first_entry="$(printf '%s\n' "$listing" | sed -n '1p')"
[[ "$first_entry" == "$ARCHIVE_ROOT/"* ]] ||
    die "unexpected archive root (wanted $ARCHIVE_ROOT/): $first_entry"

if printf '%s\n' "$listing" | grep -qvE "^${ARCHIVE_ROOT}(/|$)"; then
    die "archive contains entries outside $ARCHIVE_ROOT/"
fi
if printf '%s\n' "$listing" | grep -qE '(^|/)\.\.(/|$)'; then
    die "archive contains path traversal entries"
fi

work="$(workdir libfive)"
probe=""
cleanup() {
    rm -rf "$work"
    [[ -z "$probe" ]] || rm -rf "$probe"
}
trap cleanup EXIT

tree="$work/tree"
mkdir -p "$tree"
tar -xzf "$CACHED_ARCHIVE" -C "$tree" --strip-components=1 ||
    die "failed to extract $CACHED_ARCHIVE"

# Trim to the MPL-2.0 build subtree (design D4). dotglob is needed so
# upstream's dot-entries (.github, .gitignore) are seen and removed too.
shopt -s dotglob nullglob
for entry in "$tree"/*; do
    base="$(basename "$entry")"
    keep=false
    for wanted in "${KEEP_TOP_LEVEL[@]}"; do
        [[ "$base" == "$wanted" ]] && keep=true
    done
    if [[ "$keep" == false ]]; then
        rm -rf "$entry"
    fi
done
shopt -u dotglob nullglob
for sub in "${DROP_IN_LIBFIVE[@]}"; do
    rm -rf "$tree/libfive/$sub"
done

cp "$LICENSE_SRC" "$tree/LICENSE" || die "cannot install MPL-2.0 license"

probe="$(workdir probe)"
cp -a "$tree/." "$probe/" || die "cannot stage patch probe copy"
info "verifying patch set on a throwaway copy"
apply_patch_set "$probe" 1
reject_leftovers "$probe"

apply_patch_set "$tree"

# Validate the finished tree before touching the installed copy.
report_problems "$tree"
digest="$(tree_digest "$tree")"

[[ -n "$EXPECTED_DIGEST" ]] ||
    die "vendor/VENDOR.md has no tree-sha256 line; set it to:
tree-sha256: $digest"

[[ "$digest" == "$EXPECTED_DIGEST" ]] ||
    die "built tree digest $digest does not match vendor/VENDOR.md ($EXPECTED_DIGEST); refusing to install"

replace_dir "$tree" "$TARGET_DIR"

log "vendor/libfive vendored at $COMMIT"
log "tree-sha256: $digest"
