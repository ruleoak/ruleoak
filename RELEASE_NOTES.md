# Release Notes

## RuleOak Core v2.1.0

RuleOak Core v2.1.0 is the public developer release for adding governance to AI tool calls. It consolidates protocol conformance, policy packs, adapter examples, approval UX, audit reporting, signed integrity, real evidence connector foundations, and a local approval/audit product surface into a clean external package.

### Highlights

- Developer-first README and 10-minute quickstart path
- Demo GIF for the tool-call governance flow
- Governance Protocol v1 conformance kit with golden records, canonical hash fixtures, replayable evidence/audit fixtures, and compatibility badges
- Policy-pack manifests, scenario tests, explain/diff support, compatibility checks, and signatures
- Adapter examples for LangGraph-style, CrewAI-style, MCP proxy, and coding-agent boundaries
- Real read-only evidence connector foundation for GitHub, Jira, ServiceNow, Confluence, GitLab, Prometheus, and Grafana-style systems
- Approval UX v2 with reviewer comments, evidence requests, SLA metadata, decision history, and approval packets
- Audit Report Viewer v2 with verification state, redaction view, report comparison, and audit-packet export
- Local approval/audit product surface for external developer testing
- Signed policy packs, signed evidence bundles, signed audit chains, and offline verification
- Reference verticals for AI coding agents, enterprise RAG answers, personal local-first assistants, and SRE monitoring change governance
- External-facing GitHub issue templates, CI guidance, launch checklist, and package-publish guardrails

### Useful commands

```bash
npm install
npm run quickstart:all
npm run adapter:real:all
npm run evidence:real:v1
npm run product:surface:demo
npm run product:surface:build
npm run product:surface:serve
npm run protocol:kit
npm run integrity:verify
npm run release:public-check
npm test
npm pack --dry-run
```

### Claim boundary

RuleOak Core v2.1.0 provides a tested governance boundary for AI tool calls. It is not a certified compliance product, hosted control plane, OS sandbox, or guarantee that an AI system is safe.

### Validation before publishing

Before publishing or announcing, run:

```bash
npm install
npm run launch:check
npm run release:public-check
npm run quickstart:all
npm run adapter:real:check
npm run evidence:real:check
npm run product:surface:check
npm run protocol:kit
npm run integrity:verify
npm test
npm pack --dry-run
```

## Earlier public releases

- v2.0.3 — previous public release line
- v1.0.1 — earlier public baseline
