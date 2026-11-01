#!/usr/bin/env bash
# scripts/fetch-deps.sh — fetch and verify the pinned header-only dependencies.
#
# Implements AD-016/AD-021: Eigen and Boost headers are pinned by SHA-256 in
# scripts/deps.lock, cached under build/cache/deps/, and extracted under
# build/deps/<id> (gitignored). Nothing is built; both are header-only.
#
# Usage:
#   scripts/fetch-deps.sh                 fetch missing/damaged trees
#   scripts/fetch-deps.sh --force         re-extract every dependency
#   scripts/fetch-deps.sh --check         verify existing trees, write nothing
#   scripts/fetch-deps.sh [--force|--check] <id> [<id>...]
#
# Exit status is non-zero on any lock, download, checksum, or tree problem.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/vendor-common.sh
source "$SCRIPT_DIR/lib/vendor-common.sh"

readonly LOCK_FILE="$SCRIPT_DIR/deps.lock"
readonly CACHE_DIR="$CACHE_ROOT/deps"

MODE=run
REQUESTED=()

usage() {
    cat <<'EOF'
Usage: scripts/fetch-deps.sh [--force | --check] [<id> ...]

  (no option)  Fetch dependencies whose trees are missing or damaged.
  --force      Re-download/re-extract every selected dependency.
  --check      Verify the selected dependency trees only; never writes.

Without <id> arguments every entry in scripts/deps.lock is selected.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --force) MODE=force ;;
        --check) MODE=check ;;
        -h | --help)
            usage
            exit 0
            ;;
        -*)
            usage >&2
            die "unknown option: $1"
            ;;
        *) REQUESTED+=("$1") ;;
    esac
    shift
done

need_cmd tar sha256sum awk find

[[ -f "$LOCK_FILE" ]] || die "missing dependency lock: $LOCK_FILE"

# --------------------------------------------------------------------------
# Lock parsing
# --------------------------------------------------------------------------

# all_ids — lock order, comments and blank lines skipped.
all_ids() {
    awk -F'\t' '!/^[[:space:]]*#/ && NF > 1 { print $1 }' "$LOCK_FILE"
}

# dep_field <id> <column-number>
dep_field() {
    awk -F'\t' -v id="$1" -v col="$2" '
        !/^[[:space:]]*#/ && NF > 1 && $1 == id { print $col; exit }
    ' "$LOCK_FILE"
}

row_count() {
    awk -F'\t' -v id="$1" '!/^[[:space:]]*#/ && $1 == id { n++ } END { print n + 0 }' "$LOCK_FILE"
}

if [[ ${#REQUESTED[@]} -eq 0 ]]; then
    read -r -a SELECTED <<<"$(all_ids | tr '\n' ' ')"
else
    SELECTED=("${REQUESTED[@]}")
fi
[[ ${#SELECTED[@]} -gt 0 ]] || die "no dependencies selected in $LOCK_FILE"

# Validate the whole lock once so a malformed row cannot hide behind an
# unselected dependency.
while IFS= read -r id; do
    [[ -n "$id" ]] || continue
    [[ "$(row_count "$id")" == 1 ]] ||
        die "scripts/deps.lock has duplicate entry for '$id'"
    fields="$(awk -F'\t' -v id="$id" '!/^[[:space:]]*#/ && $1 == id { print NF }' "$LOCK_FILE")"
    [[ "$fields" == 8 ]] ||
        die "scripts/deps.lock entry '$id' has $fields fields, expected 8 (id version url sha256 dest archive_root members sentinel)"
    url="$(dep_field "$id" 3)"
    sha="$(dep_field "$id" 4)"
    dest="$(dep_field "$id" 5)"
    [[ "$url" == https://* ]] || die "dependency '$id' url must be https: $url"
    [[ "$sha" =~ ^[0-9a-f]{64}$ ]] || die "dependency '$id' sha256 is invalid: $sha"
    [[ "$dest" == build/deps/* ]] || die "dependency '$id' dest must live under build/deps: $dest"
done < <(all_ids)

for id in "${SELECTED[@]}"; do
    [[ "$(row_count "$id")" == 1 ]] ||
        die "no entry for '$id' in scripts/deps.lock"
done

# --------------------------------------------------------------------------
# Per-dependency work
# --------------------------------------------------------------------------

sentinel_ok() {
    [[ -f "$1" ]]
}

fetch_dep() {
    local id=$1
    local version url sha dest root members sentinel
    version="$(dep_field "$id" 2)"
    url="$(dep_field "$id" 3)"
    sha="$(dep_field "$id" 4)"
    dest="$REPO_ROOT/$(dep_field "$id" 5)"
    root="$(dep_field "$id" 6)"
    members="$(dep_field "$id" 7)"
    sentinel="$(dep_field "$id" 8)"
    local archive_name
    archive_name="$(basename "$url")"

    if [[ "$MODE" == run ]] && sentinel_ok "$dest/$sentinel"; then
        log "$id: current ($dest, $version)"
        return 0
    fi

    cached_download "$url" "$sha" "$CACHE_DIR/$id" "$archive_name" "$id $version"

    local work tree
    work="$(workdir "deps-$id")"
    trap 'rm -rf "$work"' EXIT
    tree="$work/tree"
    mkdir -p "$tree"

    IFS=',' read -r -a member_list <<<"$members"
    local member
    for member in "${member_list[@]}"; do
        [[ -n "$member" ]] || continue
        tar -xzf "$CACHED_ARCHIVE" -C "$tree" --strip-components=1 \
            "$root/$member" ||
            die "$id: member '$root/$member' missing from $archive_name"
    done

    [[ -f "$tree/$sentinel" ]] ||
        die "$id: extracted tree lacks $sentinel"

    replace_dir "$tree" "$dest"
    rm -rf "$work"
    trap - EXIT
    log "$id: extracted $version to ${dest#"$REPO_ROOT"/}"
}

check_dep() {
    local id=$1 dest sentinel
    dest="$REPO_ROOT/$(dep_field "$id" 5)"
    sentinel="$(dep_field "$id" 8)"

    [[ -d "$dest" ]] || die "$id: missing tree $dest"
    [[ -f "$dest/$sentinel" ]] ||
        die "$id: tree is incomplete (missing $sentinel in $dest)"
    log "$id: ok ($dest)"
}

case "$MODE" in
    check)
        log "Checking pinned dependencies"
        for id in "${SELECTED[@]}"; do
            check_dep "$id"
        done
        ;;
    force | run)
        for id in "${SELECTED[@]}"; do
            fetch_dep "$id"
        done
        ;;
esac
