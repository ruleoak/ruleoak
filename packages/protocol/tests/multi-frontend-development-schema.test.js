/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {validateMultiFrontendDevelopmentReport} from '../src/multi-frontend-development.js';
const report={multi_frontend_development_version:'0.1',run_id:'mf:test',outcome:'fix playback',frontend:{surface:'chat'},implementation:{mode:'external'},status:'VERIFIED',model_usage:{role_calls:0,hosted_calls:0,input_tokens:0,output_tokens:0,total_tokens:0},authority:{implementation:'EXTERNAL_NON_AUTHORITATIVE'},verification:{status:'PASS'}};
assert.equal(validateMultiFrontendDevelopmentReport(report).valid,true);
assert.equal(validateMultiFrontendDevelopmentReport({...report,model_usage:{...report.model_usage,total_tokens:1}}).valid,false);
console.log('Multi-Frontend Development protocol tests passed');
