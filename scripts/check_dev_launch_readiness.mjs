/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const contract=JSON.parse(read('qa/dev-launch-contract.json'));
assert.equal(contract.product_name,'RuleOak Dev');
assert.equal(contract.tagline,'AI writes. RuleOak verifies.');
assert.equal(contract.canonical_repository,'ruleoak/ruleoak');
assert.equal(contract.front_door.default_implementation,'external');
assert.equal(contract.front_door.default_frontend,'chat');
assert.equal(contract.front_door.duplicate_ruleoak_coding_model_calls,0);
assert.equal(contract.truth_boundaries.handoff_is_build_evidence,false);
assert.equal(contract.truth_boundaries.implicit_learning_promotion_allowed,false);
for(const path of ['docs/dev-quickstart.md','docs/integrations/chatgpt.md','docs/integrations/codex.md','docs/integrations/claude-code.md','docs/integrations/cursor.md','docs/community-roadmap.md','docs/public-release-checklist.md','packages/cli/src/dev-frontdoor.js','packages/cli/tests/dev-frontdoor-cli.test.js','.github/ISSUE_TEMPLATE/dev_candidate_feedback.yml'])assert.equal(existsSync(path),true,`missing Dev launch artifact ${path}`);
const cli=read('packages/cli/src/cli.js'),frontdoor=read('packages/cli/src/dev-frontdoor.js'),readme=read('README.md'),action=read('action.yml'),roadmap=read('docs/community-roadmap.md');
assert.match(cli,/command === 'dev'/);assert.match(cli,/ruleoak dev demo/);assert.match(frontdoor,/implementationMode:'external'/);assert.match(frontdoor,/frontend:'chat'/);assert.match(frontdoor,/RULEOAK_BUILD_INBOX/);assert.match(readme,/AI writes\. RuleOak verifies\./);assert.match(readme,/dev demo/);assert.match(action,/mode.*dev|dev.*mode/is);assert.match(action,/RULEOAK_DEV_CANDIDATE/);assert.match(roadmap,/Future work is driven by observed technical needs/i);assert.doesNotMatch(readme,/\bOpenOak\b/);
console.log('RuleOak Dev launch readiness check passed');
