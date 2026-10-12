# Evidence Bundle & Sink

Evidence Bundle & Sink is a **derived evidence/export boundary**, not an authority or execution boundary.

## Sink SPI

`@ruleoak/core` exports:

- `EVIDENCE_SINK_SPI_VERSION`
- `validateEvidenceSinkDescriptor()`
- `EvidenceSinkRegistry`
- `LocalFileEvidenceSink`

A sink declares:

- stable `sink_id`;
- network mode (`none`, `optional`, or `required`);
- accepted privacy profiles.

`EvidenceSinkRegistry.deliver()` gives each sink its own copy of the already-created bundle bytes and a cloned manifest. A failing sink produces a bounded per-sink failure result. It does not delete, rewrite, invalidate, or authorize anything in the local RuleOak evidence/authority path.

The local-file sink is the reference implementation. Syslog/SIEM and organization evidence services are potential future integrations and are not part of the v0.50.0 local-file reference implementation.
