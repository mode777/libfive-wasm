# interval-rounding Specification

## Purpose

Guarantees that interval arithmetic inside the WebAssembly artifact produces
conservative bounds without relying on floating-point rounding modes, so mesh
output never silently loses features because of undersized intervals.

## Requirements

### Requirement: Software rounding policy
The wasm build SHALL configure `boost::numeric::interval` with a software
rounding policy that widens every arithmetic and transcendental result with
epsilon/`nextafter`-style guards, rather than changing or depending on the
floating-point rounding mode.

#### Scenario: Policy is software rounded
- **WHEN** the build is configured for wasm
- **THEN** the interval type used by the kernel selects a rounding policy that
  widens results outwards and sets no hardware rounding mode

#### Scenario: PoC shortcut is not used
- **WHEN** the build flags and compile definitions are inspected
- **THEN** the `__USE_ISOC99` rounding shortcut is absent and the policy is not
  Boost's hardware-rounded `rounded_*_std` family

### Requirement: No rounding-mode dependence in the artifact
The compiled artifact SHALL NOT depend on floating-point rounding-mode control;
it SHALL contain no calls to `fesetround`/`fegetround` or equivalent fenv
rounding-mode routines.

#### Scenario: Rounding-mode symbols are absent
- **WHEN** the built wasm is inspected for fenv rounding-mode symbols
- **THEN** none are referenced

#### Scenario: Policy declares no mode switching
- **WHEN** the interval rounding policy header is inspected
- **THEN** its rounding-mode hooks are no-ops and it contains no
  `fesetround`/`fegetround` calls

### Requirement: Conservative interval bounds
Point and interval evaluations SHALL return bounds that contain the true range
of the evaluated function over the requested region. A bound that misses any
value actually taken by the function SHALL be treated as a failure.

#### Scenario: Exponential bounds contain the true range
- **WHEN** `exp(x)` is evaluated over a region where x spans `[0, 1]`
- **THEN** the returned lower bound is at most 1 and the upper bound is at least
  Euler's number, while containing every value in between

#### Scenario: Trigonometric bounds contain the true range
- **WHEN** `sin(x)` is evaluated over a region where x spans `[0, π]`
- **THEN** the returned interval contains both 0 and 1

#### Scenario: Mixed trees remain conservative
- **WHEN** a tree mixing transcendental functions, multiplication and division
  is evaluated over a wide region
- **THEN** every densely sampled value of the function inside that region lies
  within the returned bounds

### Requirement: Bounds remain usable
Bounds SHALL be tight enough to drive adaptive meshing: for well-conditioned
inputs, widening SHALL stay within a small constant of the true range rather
than collapsing to an unbounded or pathologically wide interval.

#### Scenario: Exponential bounds stay tight
- **WHEN** `exp(x)` is evaluated over `[0, 1]`
- **THEN** the interval width exceeds the true range by no more than a small
  rounding margin (well under one percent of a unit)

#### Scenario: Division bounds stay tight
- **WHEN** `1/x` is evaluated over `[1, 2]`
- **THEN** the interval contains `[0.5, 1]` and its width is close to 0.5

### Requirement: Discontinuities are not silently narrowed
Interval evaluation across a singularity or domain edge SHALL return a
conservative result (an unbounded, whole-line, or explicitly flagged interval)
instead of a narrow finite interval that omits possible values.

#### Scenario: Division across zero
- **WHEN** `1/x` is evaluated over a region spanning `[-1, 1]`
- **THEN** the result covers both large positive and large negative values (or
  is explicitly unbounded/flagged) and is not a narrow finite interval

#### Scenario: Domain-limited functions stay conservative
- **WHEN** a function with a restricted domain (for example a square root or
  logarithm) is evaluated over a region that crosses its domain edge
- **THEN** the result does not claim a finite narrow range for inputs where the
  function is undefined

### Requirement: Interval acceptance suite gates the build
The build SHALL run an interval test suite against the freshly built artifact,
covering exponential, trigonometric, reciprocal/division and mixed-tree cases
over wide regions, and SHALL fail when any containment or tightness assertion
fails.

#### Scenario: Suite runs with the build
- **WHEN** `scripts/build-wasm.sh` completes the link step
- **THEN** it runs the interval suite against that artifact before reporting
  success

#### Scenario: Undersized intervals fail the build
- **WHEN** the rounding policy is replaced by a non-widening or
  hardware-dependent policy that produces too-narrow bounds
- **THEN** the interval suite fails and the build exits non-zero
