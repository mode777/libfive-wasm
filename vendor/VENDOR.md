# Vendored libfive — pin record

`vendor/libfive/` is **generated, not committed**. It is recreated from the
upstream archive recorded in [`libfive.lock`](./libfive.lock) by
`scripts/vendor-libfive.sh` (AD-016, AD-021). Never edit the vendored tree: put
build adjustments in `vendor/patches/*.patch` instead.

## Pin

| Field | Value |
|---|---|
| Upstream | <https://github.com/libfive/libfive> |
| Commit | `918387a9220dbac2f7ab32fb35e274c6794439cf` |
| Commit date | 2026-10-16 |
| Branch at pin time | `master` (HEAD) |
| Archive | `https://codeload.github.com/libfive/libfive/tar.gz/918387a9220dbac2f7ab32fb35e274c6794439cf` |
| Archive size | 918,008 bytes |
| Archive SHA-256 | `05badee75864c8ad13807a4dea40339018db9cfb14f0fd61de0b691472c4e89e` |

### Why this commit

Upstream publishes no usable release tags (the repository only carries the
historical `rip-dmc` and `last-chance` tags), so the newest `master` commit is
the only defensible "current" revision. This commit already contains the Eigen
5 compatibility work and the Qt 6.11 build fix; pinning the immediate precursor
of the wasm build work minimises the delta the build change has to carry. The
SHA is immutable, so later upstream movement cannot change what we vendor.

## Expected tree digest

```
tree-sha256: fbcbbd50eaf172dbd510c353c591fc6614efac7cca4bcd96b55993d83998f9bf
```

The digest is SHA-256 over a sorted `"<file-sha256>  <relative-path>"` listing
of the finished tree (patches and license applied; contents and paths only, no
mtimes or permissions). `scripts/vendor-libfive.sh` refuses to install a tree
whose digest differs from this value, and `--check` reports drift.

## What the script does

1. Reads `vendor/libfive.lock` and requires `vendor/VENDOR.md` to name the same
   commit and the recorded tree digest.
2. Downloads the pinned archive (cache: `build/cache/libfive/`) and verifies
   its SHA-256 **before** extraction.
3. Extracts into a scratch directory under `build/tmp/` and trims to the
   MPL-2.0 build subtree:
   - keeps `CMakeLists.txt`, `README.md`, `CHANGELOG.md`, `libfive/` (without
     `libfive/bind/` and `libfive/test/`);
   - drops `studio/`, `libfive/bind/`, `libfive/test/`, `doc/`, `bin/`,
     `.github/` — `studio` and both binding trees are GPL-2+ and out of scope
     (AD-001).
4. Installs the carried MPL-2.0 text (see below) as `vendor/libfive/LICENSE`.
5. Applies `vendor/patches/*.patch` in the order listed in the lock, with
   `-F0` (no fuzz). The whole set is first applied to a throwaway copy, so a
   failing patch aborts before the real tree is touched.
6. Verifies the finished tree (excluded paths absent, headers and stdlib
   present, license byte-identical, digest matches) and only then replaces
   `vendor/libfive/`.

## License and provenance

Upstream ships **no root `LICENSE` file**; the MPL-2.0 scope of the port is
established from the per-file license headers (e.g.
`libfive/include/libfive/eval/interval.hpp`) and the upstream README. Because
the vendored source is redistributed inside the npm package (AD-002, AD-012),
this repository carries the canonical MPL-2.0 text as
[`LICENSE.mpl-2.0`](./LICENSE.mpl-2.0) (fetched from
<https://www.mozilla.org/media/MPL/2.0/index.txt>, SHA-256
`3f3d9e0024b1921b067d6f7f88deb4a60cbe7a78e76c64e3f1d7fc3b779b9d04`) and
installs it as `vendor/libfive/LICENSE`. AD-021 records this refinement of
AD-016's "LICENSE intact" wording.

## Verifying a vendored tree

```sh
scripts/vendor-libfive.sh --check
```

That one command verifies the pin/tree consistency, the MPL-only scope, the
license, and the recorded digest. To inspect the scope by hand:

```sh
find vendor/libfive -maxdepth 2 \( -name .git -o -name studio -o -path '*bind*' \) -print
```

The check fails (non-zero exit) if any of those paths is reintroduced.

## Bumping the pin

1. Pick the new upstream commit and record why in the change that makes the
   bump (AD-016).
2. Update `vendor/libfive.lock`: `commit`, `commit_date`, `archive_url`,
   `archive_sha256`, `archive_size`, `archive_root`, and `patches` /
   `patch_digest` if the patch set changes.
3. Rebase the carried patches under `vendor/patches/` on the new tree and
   update `patch_digest` in the lock (the script reports the computed digest
   when it mismatches).
4. Run `scripts/vendor-libfive.sh --force`; the script prints the new
   `tree-sha256`. Update the value above only after reviewing the tree.
5. Run `scripts/vendor-libfive.sh --check` and the dependency fetch
   (`scripts/fetch-deps.sh --check`), then note the bump in `docs/` and the
   change.
