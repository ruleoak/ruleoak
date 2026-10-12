/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));
const version = json('package.json').version;
const readme = read('README.md');
assert.match(readme, /Never blindly retry/i);
assert.match(readme, /Effect Boundary/i);
assert.match(readme, /READY_EFFECT_BOUNDARY/);
assert.match(readme, /Apache-2\.0/);
assert.match(readme, /AI writes\. RuleOak verifies\./);
assert.match(readme, /dev demo/);
assert.doesNotMatch(readme, /Agent Firewall \+ Flight Recorder/i);
assert.doesNotMatch(readme, /v0\.10\.2|0\.34\.0/);
assert.match(readme, new RegExp(`v${version.replaceAll('.', '\\.')}`));

for (const path of ['DEMO.md','docs/dev-quickstart.md','docs/community-roadmap.md','docs/effect-profiles.md','docs/articles/your-ai-agent-timed-out.md','docs/standards-and-benchmarks.md','CITATION.cff','.github/CODEOWNERS']) {
  assert.equal(existsSync(path), true, `missing launch artifact ${path}`);
}

for (const path of ['CONTRIBUTING.md','REUSE.toml','LICENSE.md']) assert.doesNotMatch(read(path), /packages\/protocol[\s\S]{0,120}\bMIT\b/i, `${path} contains stale protocol MIT claim`);
for (const path of ['packages/cli/package.json','packages/core/package.json','packages/protocol/package.json','package.json']) {
  const text = JSON.stringify(json(path));
  assert.match(text, /effect|Effect/i, `${path} does not present Effect Boundary/effects`);
}
const security = read('SECURITY.md');
assert.match(security, /0\.50\.x/);
assert.match(readme, /single free\/open-source project/i);
assert.doesNotMatch(readme, /RuleOak Pro(?:\s|$)|paid RuleOak edition/i);
console.log('public launch readiness check passed');
