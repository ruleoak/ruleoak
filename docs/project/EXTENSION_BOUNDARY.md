# Extension boundary

RuleOak's public Apache-2.0 repository contains the authority kernel, protocol contracts, supported adapters, developer surfaces, conformance tests, and the versioned Extension SPI.

Implementations outside this repository may provide additional policy sources, approval integrations, event sinks, Inspector intelligence, or CrashLab scenario providers through the public SPI. Such extensions are not part of the RuleOak authority kernel and must not bypass or replace deterministic public authority, policy, ExecutionLease, or revocation controls.

The public repository intentionally contains no customer records, billing operations, private deployment credentials, proprietary datasets, or owner-only release/marketing runbooks.
