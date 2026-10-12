/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = pkg.version;
const errors = [];
const must = (path, pattern, message) => {
  if (!existsSync(path)) { errors.push(`missing ${path}`); return; }
  if (!pattern.test(read(path))) errors.push(`${path}: ${message}`);
};

must('README.md', new RegExp(`npx @ruleoak/cli@${version.replaceAll('.', '\\.')}`), '60-second proof must work from the exact published CLI version');
must('docs/quickstart.md', new RegExp(`npx @ruleoak/cli@${version.replaceAll('.', '\\.')}`), 'quickstart must pin the exact public version');
must('docs/adoption-feedback.md', /feedback snapshot/, 'adoption feedback must document the privacy-safe snapshot');
must('docs/adoption-evidence-boundary.md', /must be observed outside the source archive/i, 'adoption evidence boundary must remain explicit');
must('docs/npm-publication-checklist.md', /initial-direct/, 'publication checklist must distinguish first publication');
must('docs/npm-publication-checklist.md', /stage-existing/, 'publication checklist must distinguish subsequent staged publication');
must('.github/workflows/publish.yml', /publication_mode/, 'publish workflow must expose an explicit publication mode');
must('.github/workflows/publish.yml', /npm stage publish/, 'publish workflow must support staged publishing for existing packages');
must('.github/workflows/publish.yml', /npm publish/, 'publish workflow must retain an explicit first-publication path');
must('packages/cli/src/adoption-evidence.js', /project_path_included: false/, 'shareable activation evidence must exclude project paths');
must('packages/cli/src/adoption-evidence.js', /external_adoption_proven: false/, 'source must not claim external adoption');
must('.github/ISSUE_TEMPLATE/quickstart_feedback.yml', /Did the quickstart complete\?/, 'quickstart feedback intake must exist');
must('.github/ISSUE_TEMPLATE/effect-profile.yml', /Independent postcondition/, 'Effect Profile intake must capture postcondition semantics');
must('qa/publication-readiness-contract.json', /\"external_adoption_proven\": false/, 'maturity contract must keep external adoption external');

for (const name of ['protocol','core','cli']) {
  const p = JSON.parse(read(`packages/${name}/package.json`));
  if (p.version !== version) errors.push(`${p.name}: version mismatch`);
  if (p.private === true) errors.push(`${p.name}: must be publishable`);
  if (p.publishConfig?.access !== 'public') errors.push(`${p.name}: publishConfig.access must be public`);
}

if (errors.length) {
  console.error(`PUBLICATION_READINESS_FAILED (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
assert.ok(version);
console.log(`PUBLICATION_READINESS_PASS v${version}`);
