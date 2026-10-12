/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {validateAutonomousDevelopmentReport} from '../src/autonomous-development.js';
const report={autonomous_development_version:'0.1',run_id:'autonomy:test',outcome:'fix playback',status:'VERIFIED',stop_reason:'NONE',stages:[],attempts:[],human_interaction:{manual_ruleoak_subcommands:0,manual_file_targets:0,manual_context_construction:0,manual_build_invocations:0,manual_evidence_bundles:0,interventions:0},authority:{model:'NON_AUTHORITATIVE'},summary:{verification_status:'PASS'}};
assert.equal(validateAutonomousDevelopmentReport(report).valid,true);assert.equal(validateAutonomousDevelopmentReport({...report,status:'MAGIC'}).valid,false);console.log('One-Intent Development protocol tests passed');
