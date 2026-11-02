# Spec Delta

## MODIFIED Requirements

### Requirement: Showcase deploys from the tested artifact

The project SHALL publish the showcase — including its user documentation
section — to GitHub Pages from the wasm artifact produced and validated by the
main-branch build, without rebuilding wasm in the Pages workflow, without
installing `libfive-wasm` from the npm registry, and without a separate
documentation deployment path.

#### Scenario: Successful main-branch build deploys

- **WHEN** the main-branch wasm build completes successfully
- **THEN** the Pages workflow downloads that run's `dist` artifact, builds the
  site, and deploys it

#### Scenario: Failed build does not deploy

- **WHEN** the main-branch wasm build fails
- **THEN** no new showcase deployment is published

#### Scenario: Registry is not required

- **WHEN** the site is installed and built in CI
- **THEN** `libfive-wasm` resolves from the local package artifact and no
  registry fetch of `libfive-wasm` occurs

#### Scenario: Documentation deploys with the site

- **WHEN** the Pages workflow builds and deploys the site
- **THEN** the docs build runs inside the same workflow and the deployed site
  serves the documentation routes from that single deployment
