/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root=resolve(new URL('../../..',import.meta.url).pathname),bin=resolve(root,'packages/cli/bin/ruleoak.js');
const text=execFileSync(process.execPath,[bin,'context','improve semantic impact uncertainty analysis','--dir',root,'--max-bytes','65536','--max-files','12','--json'],{encoding:'utf8'});const p=JSON.parse(text);assert.equal(p.context_package_version,'0.1');assert(p.accounting.included_bytes<=65536);assert(p.accounting.included_files<=12);assert(p.impact.affected_capability_ids.includes('cap.semantic-impact'));assert.equal(p.sufficiency.external_model_comparison.status,'NOT_RUN');console.log('Context Compiler CLI tests passed');
