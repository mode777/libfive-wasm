# Design

## Context

`playground-gallery` (AD-028) established the demo contract (`DemoMeta` with
sections/features, worker-executed `build`, raw-source Code tab), the section
taxonomy and the coverage test. The taxonomy checks *sections*, not methods:
with twelve demos the catalog touches ~31 of the ~100 methods on the
convenience surface that AD-017/AD-024 generate from `libfive_stdlib.h`. The
thumbnail pipeline (`showcase-thumbnails`) already requires every catalog demo
to have a captured, drift-checked image, and `MeshSession` already exercises
`mesh`/`exportSTL`/`probe` for the inspector. So this change is content plus
one enforcement mechanism — no new infrastructure. See proposal.md for the
coverage arithmetic and the external research that shaped the catalog.

## Goals / Non-Goals

**Goals:**

- A twenty-five-demo catalog where every canonical convenience-surface method
  appears in at least one demo's *code*, verified in CI.
- Showcase pieces that hold their own next to what OpenSCAD, JSCAD, CadQuery
  and build123d exhibit, plus ladders that teach the surface section by
  section.
- A `math` section so field-level demos are first-class in the filter row.
- Zero-allowlist coverage: every method demonstrable, no exceptions table.

**Non-Goals:**

- Per-demo customizer sliders / parameter panels (the parked playground-editor
  thread; would be a new capability with its own UI contract).
- Any change to the package runtime, wasm ABI, build system, Pages workflow or
  publish path (AD-028 boundaries preserved).
- Live editing or arbitrary user code.
- A tier split in the UI: showcase and ladder demos render in one gallery,
  ordered as one narrative.

## Decisions

### D1 — Two registers, one catalog (13 new demos)

The catalog grows by seven **showcase objects** and six **feature ladders**.
Each new demo is assigned the gap it closes up front, so coverage is designed
in rather than discovered afterwards:

| demo | register | closes |
|---|---|---|
| `lego-brick` | showcase | `boxExact`, `arrayX`, `arrayXY`, `shell` |
| `enclosure` | showcase | `boxMitered`, `shell`, `offset`, `clearance` |
| `pillow-block` | showcase | `reflectX`, `symmetricX`/`symmetricY` bolt pattern, `clearance` seat |
| `screw-thread` | showcase | `atan2`, `mod`, helix composition |
| `clock-face` | showcase | `ring`, `text`, `arrayPolarZ`, `rotate` |
| `rook` | showcase | `revolveY` profile, `coneZ`, `emptiness` |
| `displaced-pebble` | showcase | full `repel`/`attract` family (14) |
| `primitives-zoo` | ladder | `triangle`, `pyramidZ`, `coneZ`, `coneAngZ`, `halfSpace`, exact/mitered box + rectangle families, `emptiness` |
| `blend-catalog` | ladder | `intersection`, `offset`, `shell`, `blendExpt`, `blendRough`, `loft` |
| `symmetry-lab` | ladder | `reflectX/Y/Z/XY/YZ/XZ`, `symmetricX/Y/Z`, `inverse`, `neg`, `abs` |
| `deformations` | ladder | `taperXY`/`XYZ`, `shearXY`, `scaleX/Y/Z`, `scaleXYZ`, `twirlX/Y`, `twirlAxisX/Y/Z` |
| `field-math` | ladder | `pow`, `mod`, `compare`, `atan2`, `square`, `sqrt`, `div`, `nthRoot`, `exp`, `log`, `min`, `max`, `sub`, `tan`, `asin`, `acos`, `atan` |
| `eval-inspection` | ladder | `evalF`, `evalR`, `evalD`, `optimized`, `getConst`, `isVar`, `var`, `constant`, `x`, `y`, `z`, `toString` |

Alternatives considered: only showcase pieces (leaves eval/inspection and the
small primitives unshipped — the user goal is explicit coverage), or one demo
per method (≈70 demos; unmaintainable and visually dull). The two-register
split matches what other modellers actually publish. The `repel`/`attract`
family is demonstrated as one catalog piece: a slab carrying labeled
displacement patches per axis variant plus the pebble proper — consistent with
how `blend-catalog` treats blends.

### D2 — Coverage invariant via source matching (new AD-030)

`tests/showcase-coverage.test.ts` derives the required surface:

- **Stdlib functions** from `STDLIB_SPECS` in `src/gen/stdlib.ts` (the same
  generated table the bindings are built from, so the invariant tracks the
  pin automatically). A function is covered when its call form appears in any
  demo source: the free-function form (`libfive.union(`) or its method form
  when the spec declares one (`.blend(`).
- **Aliases** are resolved through the generated alias table to their target
  spec — `box(` is covered by a `boxMitered(` call. Only the canonical surface
  needs real call sites.
- **`Shape` methods** from a literal table in the test (opcode methods, plus
  `remap`, `optimized`, `toString`, `isVar`, `getConst`, `evalF`, `evalR`,
  `evalD`) and the instance factories (`x`, `y`, `z`, `constant`, `var`). A
  literal table over clever reflection: the surface is small and stable, and
  the comment pointing at `src/api/shape.ts` makes drift reviewable.
- **Matching**: strip `//` and `/* */` comments and string literals first,
  then match with word-boundary call patterns (`\bname\s*\(`; `\.\s*name\s*\(`
  for methods). Comment-only mentions therefore do not count, and identifier
  substrings (`mod` inside `arrayPolarZ`) cannot false-positive.

Alternatives considered: runtime introspection of the module object (can't see
method forms, silently passes on missing symbols), a hand-written checklist
(duplicates the generated table, rots), no enforcement (the status quo that
let coverage drift to a third of the surface). The invariant intentionally
couples the package surface to the site: a future stdlib bump now *requires* a
demo for anything new. That is the point (AD-030) — the alternative would be
permanently out-of-date docs.

### D3 — One new section: `math`

`SECTIONS` gains `math` (`SECTION_LABELS.math = 'Math'`); the filter row
generates itself from the manifest, and the closed-set type makes a typo a
compile error (D1 of `playground-gallery`). `wavy-slab` and `field-math` carry
the tag. Rejected: a `blends` or `displacement` section — both are already
well-served by `csg`/`transforms` labels, and every added section dilutes the
filter row.

### D4 — Region/res budget per demo

Every new demo keeps `meta.res` in the 12–20 band with tight regions sized to
its geometry, so the CI mesh (capped at `res ≤ 8` by the existing test) stays
fast while the in-browser view renders detail. Fine-feature demos carry an
explicit design constraint in their source comment: the screw thread's pitch
and depth, the clock face's tick relief and the pebble's displacement radius
must produce non-empty geometry at CI `res` 8 — features smaller than the
`1/res` feature size vanish. `halfSpace` and `emptiness` are never meshed
alone; they enter compositions that bound them. Each demo's build targets
sub-second meshing in the worker at display resolution; the thread demo is
prototyped first precisely because it is the most likely to violate the budget
and need its geometry re-parameterized.

### D5 — Thumbnails ride the existing pipeline

Thumbnails are captured with `site/scripts/capture-thumbnails.mjs` on the
verification server after the demo set stabilizes, regenerating
`previews/manifest.json`; the drift test fails per-demo until then, which is
the enforced ordering. No new capture tooling (AD-028, showcase-thumbnails
requirements unchanged).

### D6 — Gallery presentation stays one flow

New demos slot into the existing curated order: showcase pieces interleaved
with the current objects early, ladders toward the end, `raw-escape` last.
The hero count is already dynamic (`demos.length`). Rejected: a tier filter
or a "basics/showcase" split — the section filter already answers "show me
the displacement demos", and a second taxonomy would compete with it.

### D7 — Docs sync

AD-030 lands in `docs/decisions.md` with this change; `docs/roadmap.md` gains
entry #12; `site/README.md`'s authoring guide gains the `math` section and the
coverage rule. No `docs/architecture.md`, `build-system.md`, `api-design.md`
or `packaging.md` content changes — the baseline describes the package and its
build, not the gallery's catalog, so nothing there goes stale.

## Risks / Trade-offs

- [Fine-feature demos mesh empty or slow at CI `res` 8] → features sized
  against the `1/res` floor per D4; the thread demo is prototyped first;
  per-demo CI failure names the demo, so tuning is local.
- [Source-matching invariant false-negatives (a used method reported
  uncovered)] → word-boundary call patterns after comment/string stripping;
  the failure names the method, making each case a one-line pattern fix, not
  a redesign.
- [Invariant couples package bumps to site work] → deliberate (AD-030); if a
  genuinely undemoable method ever appears, the escape hatch is a documented,
  justified allowlist entry — target zero.
- [26 cards' thumbnails add page weight] → lazy-loaded, content-hashed webp
  at the established size; measured impact is tens of KB per card.
- [Demo count inflates test wall-clock] → CI meshes at capped `res ≤ 8`; 13
  more sub-second meshes is noise against the existing suite.

## Migration Plan

Land as one main-branch commit: demos + sections + tests first (CI green
except thumbnail drift), then capture thumbnails server-side and commit the
manifest to turn the drift test green. Rollback is reverting the commit —
no data, API or artifact migration exists.

## Open Questions

None blocking. Exact `res`/region values per demo are apply-time tuning
within the D4 budget, not design unknowns.
