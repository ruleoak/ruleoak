/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {validateModelExecutionResult,MODEL_EXECUTION_ROLES} from '../src/model-execution.js';
assert.equal(MODEL_EXECUTION_ROLES.length,4);
const base={model_execution_version:'0.1',execution_id:'model-exec:test',role:'planner',status:'COMPLETED',authority:'NON_AUTHORITATIVE',provider:{provider_id:'deterministic-reference-a',kind:'deterministic',roles:['planner'],network_required:false},input:{},output:{claim:'MODEL_OUTPUT_NON_AUTHORITATIVE'},usage:{kind:'ESTIMATED_LOCAL',total_tokens:1},evidence_authority:'EXTERNAL_TO_MODEL_EXECUTION',tool_authority:'EXTERNAL_TO_MODEL_EXECUTION'};
assert.equal(validateModelExecutionResult(base).valid,true);
assert.equal(validateModelExecutionResult({...base,authority:'AUTHORITATIVE'}).valid,false);
assert.equal(validateModelExecutionResult({...base,evidence_authority:'MODEL'}).valid,false);
console.log('Model-Independent Execution protocol tests passed');
