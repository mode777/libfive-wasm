#!/usr/bin/env bash
# Shared helpers for the vendoring and dependency-fetch scripts (AD-016, AD-021).
#
# This file is sourced, never executed. Callers own shell options
# (`set -euo pipefail`) and are responsible for cleaning their own temp dirs.
#
# Required commands are checked by the callers through `need_cmd`; nothing here
# touches the network except `cached_download`, which never runs unprompted.

if [[ -z "${REPO_ROOT:-}" ]]; then
    REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi
readonly REPO_ROOT
readonly CACHE_ROOT="$REPO_ROOT/build/cache"
readonly TMP_ROOT="$REPO_ROOT/build/tmp"

# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------

log()  { printf '%s\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }

die() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

# --------------------------------------------------------------------------
# Environment
# --------------------------------------------------------------------------

need_cmd() {
    local cmd
    for cmd in "$@"; do
        command -v "$cmd" >/dev/null 2>&1 ||
            die "required command not found: $cmd"
    done
}

# True when a downloader is available. curl is preferred, wget is the fallback.
have_downloader() {
    command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1
}

# ensure_dir <dir> — create a directory tree and fail with context if it cannot.
ensure_dir() {
    mkdir -p "$1" || die "cannot create directory: $1"
}

# --------------------------------------------------------------------------
# Integrity
# --------------------------------------------------------------------------

sha256_file() {
    sha256sum "$1" | awk '{print $1}'
}

# verify_sha256 <file> <expected-sha256> <label>
verify_sha256() {
    local file=$1 expected=$2 label=$3 actual
    [[ -f "$file" ]] || die "$label: file not found: $file"
    actual="$(sha256_file "$file")" || die "$label: cannot hash $file"
    if [[ "$actual" != "$expected" ]]; then
        die "$label: SHA-256 mismatch (expected $expected, got $actual)"
    fi
}

# Print a decision-blocking cache path. Kept as a plain function so callers can
# show the exact file in error messages.
cache_path() {
    local dir=$1 name=$2
    printf '%s/%s\n' "$dir" "$name"
}

# --------------------------------------------------------------------------
# Downloads
# --------------------------------------------------------------------------

# cached_download <url> <expected-sha256> <cache-dir> <cache-file-name> [label]
#
# Reuses a cached archive only after re-verifying its digest; a cached file that
# fails verification aborts (never silently refetches, so tampering is visible).
# Sets CACHED_ARCHIVE to the verified path.
cached_download() {
    local url=$1 expected=$2 dir=$3 name=$4 label=${5:-$4}
    local dest part
    dest="$(cache_path "$dir" "$name")"
    part="$dest.part"

    if [[ -f "$dest" ]]; then
        local actual
        actual="$(sha256_file "$dest")"
        if [[ "$actual" != "$expected" ]]; then
            die "cached archive for $label is corrupt: expected $expected, got $actual; delete $dest and re-run"
        fi
        CACHED_ARCHIVE="$dest"
        info "using cached archive for $label: $dest"
        return 0
    fi

    have_downloader || die "neither curl nor wget is available to fetch $label"
    ensure_dir "$dir"
    rm -f "$part"
    info "downloading $label: $url"
    if command -v curl >/dev/null 2>&1; then
        curl --fail --location --silent --show-error \
            --output "$part" "$url" ||
            die "download failed for $label: $url"
    else
        wget --quiet --output-document="$part" "$url" ||
            die "download failed for $label: $url"
    fi
    verify_sha256 "$part" "$expected" "downloaded archive for $label"
    mv -f "$part" "$dest" || die "cannot move $part to $dest"
    CACHED_ARCHIVE="$dest"
}

# --------------------------------------------------------------------------
# Filesystem
# --------------------------------------------------------------------------

# tree_digest <dir>
#
# SHA-256 over a sorted "<content-sha256>  <relative-path>" listing. mtimes,
# permissions and ownership are ignored so independent extractions compare
# equal; file bytes and paths are what matter.
tree_digest() {
    local dir=$1
    [[ -d "$dir" ]] || die "tree_digest: not a directory: $dir"
    (
        cd "$dir" || exit 1
        find . -type f -print0 |
            LC_ALL=C sort -z |
            while IFS= read -r -d '' file; do
                printf '%s  %s\n' "$(sha256sum "$file" | awk '{print $1}')" "${file#./}"
            done
    ) | sha256sum | awk '{print $1}'
}

# replace_dir <new-dir> <final-dir>
#
# Atomic-enough swap: the new tree is fully built before the old one is
# touched, and the rename keeps the window small.
replace_dir() {
    local new=$1 final=$2
    [[ -d "$new" ]] || die "replace_dir: missing new tree: $new"
    ensure_dir "$(dirname "$final")"
    rm -rf "$final" || die "cannot remove old tree: $final"
    mv "$new" "$final" || die "cannot install tree: $final"
}

# workdir <prefix> — create a unique scratch directory under build/tmp.
workdir() {
    ensure_dir "$TMP_ROOT"
    mktemp -d "$TMP_ROOT/$1.XXXXXX"
}

# reject_leftovers <dir> — fail if a patch left rejects or backups behind.
reject_leftovers() {
    local dir=$1 found
    found="$(find "$dir" \( -name '*.rej' -o -name '*.orig' \) -print -quit)"
    [[ -z "$found" ]] || die "patch application left artifacts: $found"
}
