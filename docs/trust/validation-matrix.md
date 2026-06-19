# Validation Matrix

This matrix summarizes the checks that support RuleOak Core v2.1.0's trust posture.

| Area | Command | What it validates |
|---|---|---|
| Full Core suite | `npm test` | runtime, examples, protocol, adapters, policy packs, reports, safety tests |
| Release wording | `npm run release:consistency` | public docs do not mislabel versions |
| Public release checks | `npm run release:public-check` | README, demo assets, GitHub-facing files, and external release posture |
| Trust posture | `npm run trust:check` | trust docs, claims, security/licensing pages exist and avoid banned claims |
| Protocol conformance | `npm run protocol:kit` | governance record compatibility, golden records, hash fixtures, and invalid-record rejection |
| Protocol replay | `npm run protocol:replay` | evidence bundle and audit-chain verification |
| Policy pack validation | `npm run policy:pack:validate` | manifest structure and compatibility metadata |
| Policy scenarios | `npm run policy:pack:scenarios` | expected allow/approval/deny behavior |
| Signed integrity | `npm run integrity:verify` | signed policy packs, signed evidence bundles, signed audit chains, and offline verification |
| Real framework examples | `npm run adapter:real:check` | LangGraph, CrewAI, MCP proxy, and coding-agent boundary examples |
| Real evidence connectors | `npm run evidence:real:check` | read-only connector examples and mocked connector validation |
| Approval and audit surface | `npm run product:surface:check` | local approval/audit product surface generation and verification |
| Package hygiene | `npm pack --dry-run` | published package excludes generated artifacts |
| Reference verticals | `npm run test:reference-verticals-extra` | non-SRE vertical artifacts are generated |
| SRE reference | `npm run test:sre-monitoring-change` | SRE vertical artifacts are generated |

The matrix is evidence of engineering discipline. It is not an external certification.
