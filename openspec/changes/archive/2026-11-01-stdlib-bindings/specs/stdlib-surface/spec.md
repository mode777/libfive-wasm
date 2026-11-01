# stdlib-surface Spec Delta

## Purpose

Defines the generated libfive standard-library surface: full header-derived
coverage of `libfive_stdlib.h` as typed camelCase instance functions and
`Shape` methods, argument marshalling with upstream defaults, string handling,
and the boundary-validation and lifetime rules shared with the convenience
API (AD-017, AD-024).

## ADDED Requirements

### Requirement: Header-derived surface completeness
The standard-library surface SHALL be derived from the vendored
`libfive_stdlib.h`: every `LIBFIVE_STDLIB` declaration SHALL be callable, every
`LIBFIVE_ALIAS` SHALL resolve to the behavior of its target declaration, and
sections, doc comments, argument kinds and `__0`/`__1` defaults SHALL be
carried into the generated surface. The build SHALL fail when checked-in
generated output no longer matches the vendored header.

#### Scenario: Every declaration is covered
- **WHEN** the generated surface is compared with the declarations parsed from
  `libfive_stdlib.h`
- **THEN** there is exactly one callable instance function per declaration,
  with no declaration missing and no function without a declaration

#### Scenario: Aliases mirror their targets
- **WHEN** an alias such as `box`, `cylinder`, `torus`, `rotate`,
  `arrayPolar` or `blend` is called and its target is called with the same
  arguments
- **THEN** both produce shapes with identical evaluation results

#### Scenario: Stale generated output fails the build
- **WHEN** the vendored header declares a function that the checked-in
  generated files do not contain (or contain without a declaration)
- **THEN** `scripts/build-wasm.sh` exits non-zero naming the stale generated
  files instead of building an artifact with a divergent surface

### Requirement: Instance functions
The instance returned by `init()` SHALL expose every generated stdlib function
as a camelCase function over the instance's wasm heap (`libfive.sphere(...)`,
`libfive.move(...)`, `libfive.text(...)`, ...), for every section, without
requiring a receiver `Shape` and without caller-side struct allocation or
manual wasm memory management. Each call SHALL return a new `Shape` owned by
the caller.

#### Scenario: Sections are reachable
- **WHEN** one function from each section is called on an instance — a shape
  constructor, an array function, a transform, `text` and a csg function
- **THEN** each returns a `Shape` that can be evaluated and meshed through
  that instance

#### Scenario: Vector arguments are plain JS arrays
- **WHEN** a function whose C signature takes `tvec2`/`tvec3` by value is
  called (for example `box([0, 0, 0], [1, 2, 3])` or
  `sphere(1, [1, 0, 0])`)
- **THEN** the call succeeds with JS array arguments and the caller never
  allocates or fills a C struct

### Requirement: Scalar and vector coercion
Every slot that the C signature types as `libfive_tree` or `tfloat` SHALL
accept `TFloat` (`number | Shape`), with plain numbers wrapped as constant
trees; `tvec2`/`tvec3` slots SHALL accept `Vec2Arg`/`Vec3Arg` and coerce each
component independently; `int` slots SHALL accept integral numbers.
Coercion SHALL NOT mutate or free an argument, and a `Shape` argument SHALL be
shared, not copied.

#### Scenario: Numbers coerce like constants
- **WHEN** `sphere(1)` and `sphere(libfive.constant(1))` are evaluated at the
  same points
- **THEN** both produce equal values

#### Scenario: Vector components coerce independently
- **WHEN** a constructor such as `circle(1, [0, libfive.y()])` is called with a
  mixed `number`/`Shape` vector
- **THEN** the call succeeds and each component behaves as the corresponding
  coerced value

#### Scenario: Integer slots accept integers
- **WHEN** `polygon(1, 6)` or `arrayX(shape, 3, 1)` is called
- **THEN** the call succeeds and produces a usable shape

### Requirement: Optional argument defaults
Optional arguments marked with `__0`/`__1` in the header SHALL be optional in
the generated signatures and SHALL default to the upstream value: `0` or `1`
for a `tfloat` slot, and that value repeated for every component of a
`tvec2`/`tvec3` slot. Omitting an optional argument SHALL behave identically
to passing its default explicitly.

#### Scenario: Optional centre defaults to the origin
- **WHEN** `sphere(1)` is compared with `sphere(1, [0, 0, 0])`
- **THEN** both shapes evaluate identically at sampled points

#### Scenario: Scalar defaults match the header suffix
- **WHEN** `reflectX()` is compared with `reflectX(0)`, and
  `taperXY([0, 0], 1, 2)` with `taperXY([0, 0], 1, 2, 1)`
- **THEN** each omitted argument behaves exactly like its explicit default

#### Scenario: Optional size/centre vectors default per component
- **WHEN** `boxCentered([1, 2, 3])` is compared with
  `boxCentered([1, 2, 3], [0, 0, 0])`
- **THEN** both shapes evaluate identically at sampled points

### Requirement: Shape method forms
Every generated function whose first C parameter is a shape (`libfive_tree`)
SHALL also be a method on `Shape` taking the remaining parameters, and aliases
of such functions SHALL provide the corresponding method alias. Methods SHALL
be equivalent to the top-level function called with the receiver first,
SHALL return a new `Shape`, and SHALL leave the receiver usable. CSG methods
shipped by the shape API keep their existing names.

#### Scenario: Transform, array and loft methods exist
- **WHEN** the `Shape` surface is inspected after this change
- **THEN** it exposes the transforms-section methods (`move`, `rotateX/Y/Z`,
  `scaleX/Y/Z`, `scaleXYZ`, `reflectX/Y/Z`, `symmetricX/Y/Z`, `taperXY`,
  `taperXYZ`, `shearXY`, `repel*`, `attract*`, `revolveY`, `twirl*`), the
  array and extrusion methods (`arrayX/XY/XYZ`, `arrayPolar`, `extrudeZ`) and
  `loftBetween`, and does not expose methods for receiver-less functions such
  as `sphere`, `box` or `text`

#### Scenario: Methods equal the top-level form
- **WHEN** `s.move([1, 2, 3])` is compared with `libfive.move(s, [1, 2, 3])`
- **THEN** both evaluate identically at sampled points

#### Scenario: The receiver survives a method call
- **WHEN** a method is called on a shape
- **THEN** the returned shape is distinct, the receiver still evaluates to its
  original values, and the receiver can still be freed exactly once

### Requirement: Boundary validation
Argument misuse SHALL be rejected with `LibfiveError` naming the stdlib
function before any kernel call: a scalar slot that is neither `number` nor
`Shape`, a malformed vector (not exactly two or three components), a non-
integral or non-finite `int` slot, a non-string `text` argument, or a
character outside U+0000–U+00FF in a text string. A kernel call that must
produce a tree but reports none SHALL also surface as `LibfiveError` naming
the function.

#### Scenario: Wrong scalar kind is rejected
- **WHEN** `sphere('1')` is called
- **THEN** `LibfiveError` naming `sphere` is thrown and no kernel object is
  created

#### Scenario: Malformed vector is rejected
- **WHEN** `box([0, 0], [1, 1, 1])` is called
- **THEN** `LibfiveError` naming `box` is thrown before any kernel call

#### Scenario: Bad integer slot is rejected
- **WHEN** `polygon(1, 6.5)` or `arrayX(shape, 2.5, 1)` is called
- **THEN** `LibfiveError` naming the function is thrown

#### Scenario: Bad text argument is rejected
- **WHEN** `text(1)` or `text('☃')` is called
- **THEN** `LibfiveError` naming `text` is thrown and no string buffer leaks

#### Scenario: Kernel failure is surfaced
- **WHEN** a generated function's kernel call returns no tree
- **THEN** `LibfiveError` naming the function is thrown and the argument
  shapes remain usable

### Requirement: Text encoding
`text(str, pos?)` SHALL build the kernel's custom-font geometry from a
byte-oriented encoding: one byte per character in U+0000–U+00FF (matching
upstream's Python bindings), starting at `pos` (default `[0, 0]`), with `\n`
starting a new line. The encoded buffer SHALL be released after the call
whether it succeeds or throws.

#### Scenario: Text builds distinct geometry per string
- **WHEN** `text('A')` and `text('B')` are built, and `text('A\nB')` is
  compared with `text('AB')`
- **THEN** each printed tree differs from the others, showing glyph and
  newline placement are applied

#### Scenario: Latin-1 characters reach the font
- **WHEN** `text('°')` is built
- **THEN** the call succeeds and the character is encoded as its single
  Latin-1 byte rather than being split into UTF-8 bytes

#### Scenario: The encoded buffer is released
- **WHEN** `text` is called repeatedly
- **THEN** wasm heap usage does not grow with the number of calls after the
  returned shapes are freed

### Requirement: Result lifetime
Shapes returned by generated functions and methods SHALL follow the
convenience API's ownership rules: the caller owns the result, `free()` is
idempotent, a result remains usable after its argument shapes are freed, and
constant trees created by plain-number coercion SHALL be released once the
result tree exists so they do not accumulate in the wasm heap.

#### Scenario: Results outlive their operands
- **WHEN** a generated shape and a generated transform result are built, then
  the argument shapes are freed
- **THEN** the result still evaluates correctly and can be freed exactly once

#### Scenario: Coerced constants do not accumulate
- **WHEN** many generated calls are made with plain-number arguments and their
  results are freed
- **THEN** wasm heap usage returns to its pre-call baseline

### Requirement: Raw namespace scope
Generated stdlib functions and their flat shims SHALL NOT be added to
`libfive.raw`: the curated raw namespace keeps the frozen core export
manifest, and the stdlib surface remains reachable only through the
convenience API (AD-011, AD-017).

#### Scenario: Stdlib stays off raw
- **WHEN** `libfive.raw` is inspected for a stdlib name such as `sphere`,
  `_sphere` or a generated `_shim_stdlib_*` symbol
- **THEN** none of them is present

#### Scenario: The convenience surface still works
- **WHEN** the same stdlib function is called on the instance
- **THEN** it resolves and returns a usable shape
