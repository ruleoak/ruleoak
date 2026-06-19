#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

execFileSync('node', ['scripts/trust-check.js'], { stdio: 'inherit' });
execFileSync('node', ['scripts/trust-summary.js'], { stdio: 'inherit' });

if (!existsSync('out/trust/trust-summary.json')) {
  throw new Error('trust summary was not generated');
}

const summary = JSON.parse(readFileSync('out/trust/trust-summary.json', 'utf8'));
if (summary.schema !== 'ruleoak.trust_summary.v1') throw new Error('unexpected trust summary schema');
if (summary.latest_public_core_release !== 'v2.1.0') throw new Error('latest public release must remain v2.1.0');
if (!summary.trust_assets.includes('security_model')) throw new Error('missing security model asset');
if (!summary.claim_boundary.includes('not an OS sandbox')) throw new Error('claim boundary must avoid sandbox overclaiming');

console.log(JSON.stringify({ ok: true, test: 'trust-check' }, null, 2));
