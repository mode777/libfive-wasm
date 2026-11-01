# object-lifecycle Specification

## Purpose

Defines kernel-object lifetimes across the convenience API: explicit
idempotent `free()`, the `FinalizationRegistry` safety net, `debug`
leaked-object warnings, use-after-free errors, derived-object survival,
and automatic kernel-string copying (AD-005, AD-006). This is the
diagnostics behavior the `js-loader` capability defers here.

## Requirements

### Requirement: Explicit idempotent free
`Shape` and `Mesh` SHALL expose `free()` that releases exactly the
wrapped kernel object (`libfive_tree_delete` / `libfive_mesh_delete`);
calling `free()` more than once SHALL be a no-op, and a freed object
SHALL NOT be released a second time by any other path (no double free).

#### Scenario: Double free is a no-op
- **WHEN** `free()` is called twice on the same shape or mesh
- **THEN** the second call performs nothing observable and throws
  nothing

#### Scenario: Free releases the kernel object exactly once
- **WHEN** many shapes are built and each is freed exactly once, and the
  same workload repeats with dropped references instead
- **THEN** the explicitly freed cycles keep the wasm heap at a stable
  level across repetitions, and no error from double release appears

### Requirement: GC safety net
Objects dropped without `free()` SHALL be released eventually by a
finalization registry rather than leaking: under garbage-collection
pressure, the wasm heap SHALL return toward its baseline instead of
growing without bound (AD-005).

#### Scenario: Dropped shapes are reclaimed under GC pressure
- **WHEN** many thousands of derived shapes are created and dropped
  without explicit `free()`, garbage collection is forced, and the
  workload repeats
- **THEN** the wasm heap usage returns near its baseline between
  repetitions instead of increasing stepwise

### Requirement: Debug leak warnings
When the instance was created with `debug: true` (AD-005), each
registry-driven release SHALL emit a warning naming the object kind;
with the default `debug: false` no such warning SHALL be emitted. The
warnings SHALL NOT change kernel behavior, evaluation results, or
lifetimes.

#### Scenario: Registry-driven release warns under debug
- **WHEN** on a `debug: true` instance a shape is dropped without
  `free()` and garbage collection reclaims it
- **THEN** a warning naming the released object kind is emitted

#### Scenario: Default instance is silent
- **WHEN** the same drop-and-collect workload runs on a default instance
- **THEN** no lifecycle warning is emitted and results are identical to
  the debug run

### Requirement: Use-after-free errors
Any method call or property access on a freed `Shape` SHALL throw
`LibfiveError` whose message names the freed object kind; freed `Mesh`
view and count access throws are specified by the `meshing` capability.
The error SHALL be thrown before any kernel call.

#### Scenario: Method on freed shape throws a named error
- **WHEN** `free()` is called on a shape and a method such as `add` or
  `evalF` is then called on it
- **THEN** `LibfiveError` naming the freed shape is thrown

#### Scenario: Property access on freed shape throws
- **WHEN** the `tree` handle of a freed shape is read
- **THEN** `LibfiveError` naming the freed shape is thrown

### Requirement: Derived objects survive operand free
Freeing a `Shape` SHALL NOT invalidate shapes derived from it: the
kernel refcounts shared subtrees, so each kernel tree is released
exactly once and derived shapes remain fully usable after any operand
is freed.

#### Scenario: Derived shape usable after operand free
- **WHEN** `b = a.add(1)` is built, `a.free()` is called, and `b` is then
  evaluated, meshed, and finally freed
- **THEN** all operations succeed with the values they had before `a`
  was freed, and no double-release error occurs

### Requirement: Kernel strings are copied automatically
Strings returned by the kernel (such as `toString()`) SHALL be copied
into JavaScript immediately and the kernel-owned memory released by the
package; users SHALL never free strings, and repeated string-producing
calls SHALL NOT grow the wasm heap.

#### Scenario: Repeated toString neither leaks nor degrades
- **WHEN** `toString()` is called many times in succession on the same
  shape
- **THEN** every call returns the same text and the wasm heap stays at a
  stable level across the calls
