/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const read=path=>readFileSync(path,'utf8'); const json=path=>JSON.parse(read(path));
const crosswalk=json('standards/security-crosswalk.json'); const launch=json('standards/public-launch-readiness.json');
assert.equal(crosswalk.as_of,'2026-09-05');
for(const id of ['mcp-2026-07-28','owasp-agentic-top10-2026','owasp-agent-control-standard-preview','openssf-osps-2026-08-28','slsa-1.2','reuse-3.3','nist-ssdf']) assert.ok(crosswalk.frameworks.some(item=>item.id===id),`missing framework ${id}`);
assert.match(crosswalk.non_claim,/not certification/i); assert.equal(launch.source_verifiable_readiness_score,10.0); assert.ok(launch.checks.some(item=>item.area==='External adoption'&&item.status==='UNPROVEN'));
assert.equal(crosswalk.related_release_evidence?.cyclonedx_sbom?.spec_version,'1.7'); assert.equal(crosswalk.related_release_evidence?.security_insights?.spec_version,'2.2.0');
assert.ok(crosswalk.frameworks.every(item=>/^https:\/\//.test(item.reference))); assert.match(crosswalk.frameworks.find(x=>x.id==='owasp-agent-control-standard-preview').status,/no_conformance_claim/); assert.match(crosswalk.frameworks.find(x=>x.id==='slsa-1.2').status,/no_level_claim_until_attested_release/);
const osps=crosswalk.frameworks.find(x=>x.id==='openssf-osps-2026-08-28'); assert.match(osps.status,/exact_control_matrix/);
const ospsMatrix=json('standards/openssf-osps-level1-2026-08-28.json'); assert.equal(ospsMatrix.version,'2026.08.28'); assert.equal(ospsMatrix.maturity_level,1); assert.equal(ospsMatrix.controls.length,24); assert.equal(new Set(ospsMatrix.controls.map(x=>x.id)).size,24);
for(const control of ospsMatrix.controls){assert.match(control.status,/source_pass|hybrid|external_required|not_applicable|live_channel|required/); for(const evidence of control.evidence||[]) assert.equal(existsSync(evidence),true,`${control.id} missing evidence ${evidence}`);}
for(const path of ['.github/CODEOWNERS','.github/workflows/codeql.yml','.github/workflows/dependency-review.yml','.github/workflows/scorecard.yml','.github/workflows/release-candidate.yml','.github/dependabot.yml','docs/security/OPEN_SOURCE_SECURITY_BASELINE.md','docs/standards-and-benchmarks.md','docs/release-verification.md','docs/dependency-management-policy.md','scripts/generate_sbom.mjs','security-insights.yml']) assert.equal(existsSync(path),true,`missing standards evidence: ${path}`);
const reuse=read('REUSE.toml'); assert.doesNotMatch(reuse,/packages\/protocol[^\n]*[\s\S]{0,150}SPDX-License-Identifier\s*=\s*"MIT"/i);
for(const pkg of ['packages/protocol/package.json','packages/core/package.json','packages/cli/package.json']) assert.equal(json(pkg).license,'Apache-2.0',`${pkg} license drift`);
assert.doesNotMatch(read('scripts/add_ruleoak_spdx_headers.py'),/packages\/protocol[\s\S]{0,80}return ['"]MIT['"]/i,'SPDX maintenance tooling must not recreate retired protocol-MIT split');
assert.match(read('scripts/generate_sbom.mjs'),/specVersion:\s*'1\.7'/); assert.match(read('packages/core/src/mcp/protocol.js'),/2026-07-28/); assert.match(read('SECURITY.md'),/0\.50\.x/); assert.doesNotMatch(read('SECURITY.md'),/\| `0\.10\.x` \| Supported/);
console.log(`standards baseline check passed: ${ospsMatrix.controls.length} exact OpenSSF OSPS Level-1 controls tracked`);
