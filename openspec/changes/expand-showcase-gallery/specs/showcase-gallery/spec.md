# Spec Delta

## MODIFIED Requirements

### Requirement: Catalog covers every stdlib section

The demo catalog SHALL include at least one demo for each gallery section —
`csg`, `shapes`, `transforms`, `text`, `arrays`, `eval`, `raw` and `math` — and
SHALL demonstrate 2D/revolve profiles, `remap`, shelling/clearance, the
displacement fields (`repel`/`attract`) and the raw escape hatch.

#### Scenario: Section coverage

- **WHEN** the coverage manifest is inspected
- **THEN** every gallery section maps to at least one demo and the catalog has
  twenty-five demos

#### Scenario: Arrays and 2D are represented

- **WHEN** a visitor browses the gallery
- **THEN** at least one demo uses an array function and one uses a 2D shape
  with `revolveY` or `loftBetween`

#### Scenario: Displacement fields are represented

- **WHEN** a visitor browses the gallery
- **THEN** at least one demo uses a `repel` transform and one uses an `attract`
  transform

## ADDED Requirements

### Requirement: Method-level coverage is enforced

The test suite SHALL derive the package's convenience surface from the
generated stdlib spec table plus the `Shape` opcode methods, the
evaluation/inspection methods and the instance factories, and SHALL fail when
any of them appears in no demo source (AD-030). Generated aliases SHALL count
as covered when their target function is covered. Demo sources SHALL have
comments stripped before matching, so only real call sites count.

#### Scenario: Uncovered method fails CI

- **WHEN** a stdlib function, `Shape` method or instance factory appears in no
  demo source
- **THEN** the coverage test fails and names the uncovered method

#### Scenario: Alias rides on its target

- **WHEN** a demo calls a generated alias's target function
- **THEN** the alias counts as covered without appearing in any demo source

#### Scenario: Comment mentions do not count

- **WHEN** a method name appears only inside a comment in a demo source
- **THEN** the coverage test still reports that method as uncovered
