# RuleOak repository map

The public repository is intentionally inspectable. This map explains where the main authorities live.

| Path | Role |
|---|---|
| `packages/protocol/` | Public schemas, validators, conformance vectors and stability metadata. |
| `packages/core/` | Authority, policy, approvals, leases, effect verification, evidence, Inspector, Flight Recorder and CrashLab runtime. |
| `packages/cli/` | CLI/operator workflows, MCP boundaries, reconciliation, evidence and release diagnostics. |
| `docs/` | Public architecture, integration, security, concept and release documentation. |
| `examples/` | Copyable supported examples and templates. |
| `qa/` | Machine-readable qualification contracts and coverage matrices. |
| `standards/` | Public standards/crosswalk material and launch-readiness evidence. |
| `scripts/` | Qualification, release, packaging, manifest and benchmark tooling. |
| `.github/` | CI, dependency/security review and release workflows. |
| `.ruleoak/` | Repository-owned intent/authority metadata used by RuleOak's governed development checks. |
| `SOURCE_MANIFEST.sha256` | Source-tree path/mode/hash authority for the sealed archive. |

## Package dependency direction

```text
@ruleoak/protocol
       ↑
@ruleoak/core
       ↑
@ruleoak/cli
```

Protocol defines stable public contracts. Core implements authority/effect/evidence behavior. CLI composes operator and transport workflows. Application-specific adapters should not silently redefine the protocol authority.

## Where to start reading source

For the Effect Boundary:

1. public protocol contracts and schemas;
2. core authority/execution/effect modules;
3. CLI effect/protect workflows;
4. tests for execution leases, effect profiles, evidence and MCP boundaries.

For release trust:

1. `SOURCE_MANIFEST.sha256`;
2. `scripts/check_source_manifest.mjs`;
3. workflow-security and release-reproducibility checks;
4. `.github/workflows/` release/CI files;
5. release verification documentation.
