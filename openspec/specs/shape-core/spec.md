# shape-core Specification

## Purpose

Defines the `Shape` class — the package's convenience tree-building layer
modeled on libfive's Python bindings (AD-003, AD-010): construction and
coercion, arithmetic/math opcode methods, CSG methods over the stdlib
`csg` section, inspection and remapping, and tree-level evaluation. This
is the layer normal consumers use instead of `raw`.

## Requirements

### Requirement: Coordinate, constant and variable construction
The instance returned by `init()` SHALL expose `x()`, `y()`, `z()`,
`constant(value)` and `var()`, each returning a new independent `Shape`
wrapping a fresh kernel tree; constructing a shape SHALL NOT affect
previously built shapes.

#### Scenario: Coordinate shapes evaluate as coordinates
- **WHEN** `libfive.x()`, `libfive.y()` and `libfive.z()` are constructed
- **THEN** each evaluates at a point to that point's respective
  coordinate (e.g. `evalF` of `x()` at `[3, 1, 2]` is `3`)

#### Scenario: Constant and variable shapes are distinct
- **WHEN** `libfive.constant(1.5)` and `libfive.var()` are constructed
- **THEN** the constant evaluates to `1.5` everywhere, `isVar()` is
  `false` for the constant and `true` for the variable, and each call
  produces a distinct new shape

### Requirement: Scalar coercion
Wherever a scalar argument is accepted, the type SHALL be
`TFloat = number | Shape`, and a plain `number` SHALL be wrapped as a
constant tree automatically (mirroring Python's `Shape.wrap`, AD-003);
vector arguments (`Vec3Arg`) SHALL coerce each component independently;
coercion SHALL NOT mutate or free the argument value, and a `Shape`
argument SHALL be used as-is (shared, not copied).

#### Scenario: Numbers coerce in method arguments
- **WHEN** a shape method documented to accept `TFloat` is called with a
  plain number (e.g. `libfive.x().add(2)`)
- **THEN** the call succeeds and evaluates identically to the same call
  with `libfive.constant(2)`

#### Scenario: Vector components coerce independently
- **WHEN** an evaluation point is passed as `[number, Shape, number]`
- **THEN** each component is coerced per the scalar rule and evaluation
  proceeds with the mixed values

### Requirement: Arithmetic and math methods
`Shape` SHALL expose the full opcode math-method table from
`api-design.md` (binary arithmetic/comparison and unary math methods)
with names mapped verbatim from the kernel opcode table (AD-010).
Every method SHALL accept `TFloat` arguments where the opcode takes a
second operand, SHALL return a new `Shape`, and SHALL leave its
operands usable and unmodified. The method list SHALL be exercised
against the kernel's opcode lookup so a name that stops resolving
fails the suite.

#### Scenario: The method table matches api-design.md
- **WHEN** the `Shape` surface is inspected
- **THEN** it contains exactly the binary methods `add`, `sub`, `mul`,
  `min`, `max`, `div`, `atan2`, `mod`, `compare`, `nthRoot` and the
  unary methods `abs`, `square`, `sqrt`, `sin`, `cos`, `tan`, `asin`,
  `acos`, `atan`, `exp`, `log`, `neg`

#### Scenario: Hand-built sphere via chained arithmetic
- **WHEN** `libfive.x().square().add(libfive.y().square())
  .add(libfive.z().square()).sqrt().sub(1)` is built
- **THEN** `evalR` over a region inside the unit sphere returns negative
  bounds and over a region outside returns positive bounds

#### Scenario: Method table matches the kernel opcode table
- **WHEN** each listed method name is resolved through the kernel's
  opcode lookup and the resulting opcode is used to build a tree via the
  method
- **THEN** every method name resolves and produces a working shape, and
  a name not in the kernel table is absent from `Shape` rather than
  throwing at call time

#### Scenario: Methods return new shapes without consuming operands
- **WHEN** a shape `s` is used as an operand in two different method
  calls
- **THEN** both calls return distinct new shapes, `s` still evaluates to
  its original values, and `s` remains freeable exactly once by its owner

### Requirement: CSG methods
`Shape` SHALL expose the stdlib `csg` section as methods mapping the
corresponding C stdlib symbols the artifact exports, with camelCase
naming (AD-010). Every argument slot that the C signature types as
`tfloat` SHALL accept `TFloat`. The method SHALL return a new `Shape`
and SHALL leave its operands usable.

#### Scenario: The CSG method table matches api-design.md
- **WHEN** the `Shape` surface is inspected
- **THEN** it contains `union`, `intersect`, `difference`, `inverse`,
  `offset`, `clearance`, `shell`, `blend`, `blendExpt`, `blendExptUnit`,
  `blendRough`, `blendDifference`, `morph` and `loft`

#### Scenario: CSG composition evaluates correctly
- **WHEN** a sphere `difference` a box is built and evaluated at points
  inside the sphere but outside the box versus inside both
- **THEN** the first point evaluates to the sphere's value (the box
  removed nothing there) and the second evaluates as subtracted

#### Scenario: Blend variants and aliases are callable
- **WHEN** `blend` (the alias of `blend_expt_unit`), `blendExpt`,
  `blendExptUnit`, `blendRough` and `blendDifference` (with and without
  the optional offset, which defaults per the kernel's documented
  default) are called on two sphere shapes
- **THEN** each returns a working shape whose interval evaluation
  contains densely sampled point evaluations between the operands

#### Scenario: loftBetween is not part of this surface
- **WHEN** the `Shape` prototype is inspected after this change
- **THEN** no `loftBetween` method exists — its C signature takes
  `tvec3` by value and arrives with the stdlib pointer shims
  (`stdlib-bindings`, per the recorded artifact caveat of AD-022)

### Requirement: Inspection and advanced operations
`Shape` SHALL expose `toString()` returning the kernel's Scheme-style
form of the tree, `isVar()` returning whether the tree is a free
variable, `getConst()` returning the constant value or `undefined` when
the tree is not a constant, `remap(x, y, z)` composing coordinate
remapping, `optimized()` returning a new optimized shape, the static
`Shape.fromTree(ptr)` adopting a raw kernel tree handle, and a read-only
`tree` handle for `raw` interop.

#### Scenario: toString returns the scheme form
- **WHEN** `libfive.constant(1).add(libfive.constant(2)).toString()` is
  called
- **THEN** the returned string is the kernel's printed form of the
  expression, and repeated calls return the same text

#### Scenario: getConst distinguishes constants
- **WHEN** `getConst()` is called on `libfive.constant(1.5)` and on
  `libfive.x()`
- **THEN** the first returns `1.5` and the second returns `undefined`

#### Scenario: remap composes coordinates
- **WHEN** `x().remap(shapeX, shapeY, shapeZ)` is built with shapes that
  shift coordinates
- **THEN** evaluation at a point equals the unremapped shape evaluated
  at the remapped coordinates

#### Scenario: optimized returns a distinct usable shape
- **WHEN** `optimized()` is called on a compound shape
- **THEN** a new shape is returned that evaluates to the same values as
  the original, and the original remains usable

#### Scenario: fromTree adopts a raw-built tree
- **WHEN** a tree handle built through `raw` is wrapped with
  `Shape.fromTree`
- **THEN** the wrapper exposes the full `Shape` surface, and freeing the
  `Shape` releases the adopted tree exactly once (no double free through
  `raw`)

### Requirement: Tree-level evaluation
`Shape` SHALL expose `evalF(p)` returning the value at a point,
`evalR(region)` returning `{ lower, upper }` interval bounds guaranteed
to contain the tree's values over the region, and `evalD(p)` returning
the gradient `[dx, dy, dz]` at a point; all accept plain-number and
mixed `TFloat` components per the coercion rule.

#### Scenario: evalF at known points
- **WHEN** `evalF` is called on the unit sphere shape at `[0, 0, 0]` and
  at `[2, 0, 0]`
- **THEN** the results are `-1` and `1` respectively (within float
  tolerance)

#### Scenario: evalR bounds contain sampled values
- **WHEN** `evalR` is called over a region and several points inside it
  are evaluated with `evalF`
- **THEN** each point value lies within the returned `[lower, upper]`
  bounds

#### Scenario: evalD returns the gradient
- **WHEN** `evalD` is called on `libfive.x()` at any point
- **THEN** the result is `[1, 0, 0]`

### Requirement: Boundary misuse validation
Argument misuse SHALL be rejected with `LibfiveError` before crossing
into wasm: wrong argument kinds (not `number` or `Shape` where
`TFloat` is expected), wrong arity, and malformed vector/region
arguments each throw with a message naming the operation; a kernel call
that must produce a tree but signals failure SHALL also surface as
`LibfiveError` naming the operation (`architecture.md` error handling).

#### Scenario: Wrong argument kind is rejected
- **WHEN** a `TFloat` slot receives a value that is neither `number` nor
  `Shape` (e.g. a string)
- **THEN** a `LibfiveError` naming the method is thrown and no kernel
  object is created

#### Scenario: Wrong arity is rejected
- **WHEN** a binary method such as `union` is called without its second
  operand
- **THEN** a `LibfiveError` naming the method is thrown before any
  kernel call

### Requirement: Convenience surface entry points
The package root SHALL export the `Shape` class (constructor value and
type), and the `init()` instance SHALL expose the shape factory methods
(`x`, `y`, `z`, `constant`, `var`); the exported types
(`TFloat`, `Vec3Arg`, `Region3`) SHALL be importable so consumers can
type function signatures against them.

#### Scenario: Consumer imports and typechecks against the surface
- **WHEN** a TypeScript file imports `init` and `Shape` from the package
  root and builds `const s: Shape = (await init()).x().add(1)`
- **THEN** the file typechecks and, run against a built artifact,
  produces a working shape
