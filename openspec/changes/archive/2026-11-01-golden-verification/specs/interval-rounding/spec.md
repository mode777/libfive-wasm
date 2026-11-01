# Spec Delta

## ADDED Requirements

### Requirement: Mesh-level regression gate for interval policy
The artifact-level acceptance story SHALL include the golden mesh suite, so an
interval policy that silently narrows bounds is caught both by the interval
bounds suite and by changed mesh output, and the golden harness SHALL prove
that sensitivity with a fault-injection self-test (AD-025).

#### Scenario: Undersized policy changes golden meshes
- **WHEN** the interval policy regresses to non-widening or hardware-dependent
  rounding
- **THEN** the golden suite's canonical scenes detect the resulting mesh drift
  and fail the run

#### Scenario: Fault injection proves detection
- **WHEN** the golden harness runs its one-ulp fault-injection self-test
- **THEN** the perturbed mesh is rejected, demonstrating that a subtly changed
  policy cannot pass the golden gate
