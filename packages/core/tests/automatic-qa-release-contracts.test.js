/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as protocol from '@ruleoak/protocol';
import { validateReliabilityReleaseContracts } from '../../../scripts/reliability_release_qa.mjs';

const root=resolve(process.cwd(),'../..');
const readJson=(path)=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const contracts=readJson('qa/reliability-release-contracts.json');
const matrix=readJson('qa/reliability-coverage-matrix.json');

assert.deepEqual(validateReliabilityReleaseContracts({root,protocol,contracts,reliabilityMatrix:matrix}).errors,[]);

const missingConcurrencyClass=structuredClone(contracts);
missingConcurrencyClass.contracts.concurrency_staleness.introduced_failure_classes=missingConcurrencyClass.contracts.concurrency_staleness.introduced_failure_classes.filter(x=>x!=='concurrent_race');
assert.ok(validateReliabilityReleaseContracts({root,protocol,contracts:missingConcurrencyClass,reliabilityMatrix:matrix}).errors.some(x=>x.includes('failure-class set')));

const incompleteScorecard=structuredClone(contracts);
incompleteScorecard.contracts.scorecard_ci.dimensions=incompleteScorecard.contracts.scorecard_ci.dimensions.filter(x=>x!=='evidence_completeness');
assert.ok(validateReliabilityReleaseContracts({root,protocol,contracts:incompleteScorecard,reliabilityMatrix:matrix}).errors.some(x=>x.includes('dimension set mismatch')));

const incompleteMapping={...protocol,RELIABILITY_SCORECARD_INVARIANT_DIMENSIONS:{...protocol.RELIABILITY_SCORECARD_INVARIANT_DIMENSIONS}};
delete incompleteMapping.RELIABILITY_SCORECARD_INVARIANT_DIMENSIONS.one_use_authority;
assert.ok(validateReliabilityReleaseContracts({root,protocol:incompleteMapping,contracts,reliabilityMatrix:matrix}).errors.some(x=>x.includes('cover every formal CrashLab invariant')));

console.log('Automatic QA reliability-contract tests passed');
