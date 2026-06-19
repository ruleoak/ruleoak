#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';

const summary = {
  schema: 'ruleoak.trust_summary.v1',
  latest_public_core_release: 'v2.1.0',
  earlier_public_baseline: 'v1.0.1',
  snapshot_status: 'RuleOak Core v2.1.0 release',
  trust_assets: [
    'governance_protocol_v1',
    'policy_pack_maturity_checks',
    'reference_verticals',
    'adapter_conformance',
    'security_model',
    'agpl_commercial_boundary',
    'public_release_checklist',
    'demo_playbook',
    'claims_language_guide',
    'validation_matrix'
  ],
  claim_boundary: 'RuleOak governs application-level tool-call decisions routed through RuleOak. It is not an OS sandbox or certified compliance product.',
  recommended_checks: [
    'npm test',
    'npm run release:consistency',
    'npm run trust:check',
    'npm run policy:pack:validate',
    'npm run protocol:conformance',
    'npm pack --dry-run'
  ]
};

mkdirSync('out/trust', { recursive: true });
writeFileSync('out/trust/trust-summary.json', `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, output: 'out/trust/trust-summary.json' }, null, 2));
