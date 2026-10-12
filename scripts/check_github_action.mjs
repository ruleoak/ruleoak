/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { readFileSync } from 'node:fs';
const text = readFileSync(new URL('../action.yml', import.meta.url), 'utf8');
for (const required of ['name: RuleOak adoption check','using: composite','ruleoak.js\" onboard','ruleoak.js\" doctor','GITHUB_WORKSPACE']) {
  if (!text.includes(required)) throw new Error(`action.yml missing ${required}`);
}
for (const forbidden of ['RULEOAK_TELEMETRY_ENDPOINT','curl ','wget ','secrets.','prompt','evidence.jsonl']) {
  if (text.includes(forbidden)) throw new Error(`action.yml contains forbidden adoption-action surface: ${forbidden}`);
}
console.log('GitHub Action adoption check passed');
