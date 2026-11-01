# shape-core Spec Delta

## ADDED Requirements

### Requirement: CSG and loft methods
`Shape` SHALL expose the stdlib `csg` section as methods mapping the
corresponding C stdlib symbols the artifact exports — including
`loftBetween`, whose flattened shim arrives with the generated stdlib
surface — with camelCase naming (AD-010). Every `tfloat` slot SHALL accept
`TFloat`. Methods SHALL return a new `Shape` and leave operands usable.

#### Scenario: The CSG method table matches api-design.md
- **WHEN** the `Shape` surface is inspected
- **THEN** it contains `union`, `intersect`, `difference`, `inverse`,
  `offset`, `clearance`, `shell`, `blend`, `blendExpt`, `blendExptUnit`,
  `blendRough`, `blendDifference`, `morph`, `loft` and `loftBetween`

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

#### Scenario: loftBetween arrives with the stdlib shims
- **WHEN** `a.loftBetween(b, lower, upper)` is called on two 2D shapes with
  three-component corner vectors
- **THEN** a working shape is returned whose interval evaluation over a
  region contains densely sampled point evaluations, and both operands
  remain usable

## MODIFIED Requirements

### Requirement: Arithmetic and math methods
`Shape` SHALL expose the finalized opcode math-method table from
`api-design.md` (binary arithmetic/comparison, unary math) with names mapped
verbatim from the kernel table (AD-010); binary `pow` is included and the
internal `recip`/`nanfill` opcodes stay raw-only. Every method SHALL accept
`TFloat` where the opcode takes a second operand, return a new `Shape`, and
leave its operands usable and unmodified. The table SHALL be checked against
the kernel's opcode lookup so a stale name fails the suite.

#### Scenario: The method table matches api-design.md
- **WHEN** the `Shape` surface is inspected
- **THEN** it contains exactly the binary methods `add`, `sub`, `mul`,
  `min`, `max`, `div`, `atan2`, `pow`, `mod`, `compare`, `nthRoot` and the
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

#### Scenario: pow reproduces repeated multiplication
- **WHEN** `libfive.x().pow(3)` is evaluated at sampled points
- **THEN** it equals `libfive.x().mul(libfive.x()).mul(libfive.x())` within
  float tolerance

## REMOVED Requirements

### Requirement: CSG methods

**Reason**: The generated stdlib surface makes `loftBetween` callable through
its flattened shim, so the previous requirement — whose scenario asserted that
no `loftBetween` method exists — no longer describes the surface.

**Migration**: Existing CSG method names and behavior are unchanged; the
methods are re-stated under "CSG and loft methods" with `loftBetween` added.
