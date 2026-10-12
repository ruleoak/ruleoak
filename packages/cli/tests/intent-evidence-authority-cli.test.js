/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=mkdtempSync(join(tmpdir(),'ruleoak-intent-evidence-authority-cli-'));mkdirSync(join(root,'.ruleoak','intent'),{recursive:true});
const intent={intent_manifest_version:'0.1',manifest_id:'manifest.cli.intent-evidence-authority',product:{id:'product.cli.intent-evidence-authority',name:'CLI Intent Evidence Authority'},capabilities:[{id:'cap.cli',evidence_requirement_ids:['req.cli']}],evidence_requirements:[{id:'req.cli',statement:'unit required',evidence_types:['unit'],capability_ids:['cap.cli']}],claims:[{id:'claim.cli',statement:'claim',capability_ids:['cap.cli'],evidence_requirement_ids:['req.cli']}]};
const evidence={evidence_authority_version:'0.1',bundle_id:'bundle.cli.intent-evidence-authority',intent_manifest_id:'manifest.cli.intent-evidence-authority',observations:[{id:'obs.cli',status:'PASS',statement:'unit pass',provenance:{producer_kind:'test_runner',producer_id:'cli-test',verification_method:'test_execution'},observed_at:'2026-09-06T10:00:00.000Z'}],evidence:[{id:'ev.cli',evidence_class:'UNIT',statement:'unit',observation_ids:['obs.cli'],claim_ids:['claim.cli'],evidence_requirement_ids:['req.cli'],capability_ids:['cap.cli']}]};
const intentPath=join(root,'.ruleoak','intent','sample.intent.json'),evPath=join(root,'.ruleoak','intent','sample.evidence.json');writeFileSync(intentPath,JSON.stringify(intent,null,2));writeFileSync(evPath,JSON.stringify(evidence,null,2));
const cli=resolve(new URL('../bin/ruleoak.js',import.meta.url).pathname);const run=(args)=>spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8'});
let x=run(['verify','--at','2026-09-06T12:00:00.000Z','--json']);assert.equal(x.status,0,x.stderr||x.stdout);let r=JSON.parse(x.stdout);assert.equal(r.overall_status,'PASS');assert.equal(r.coverage.percent,100);
x=run(['prove','claim.cli','--at','2026-09-06T12:00:00.000Z','--json']);assert.equal(x.status,0,x.stderr||x.stdout);assert.equal(JSON.parse(x.stdout).claim.status,'PASS');
x=run(['coverage','--at','2026-09-06T12:00:00.000Z','--json']);assert.equal(x.status,0,x.stderr||x.stdout);assert.equal(JSON.parse(x.stdout).percent,100);
x=run(['contradiction','--at','2026-09-06T12:00:00.000Z','--json']);assert.equal(x.status,0,x.stderr||x.stdout);assert.deepEqual(JSON.parse(x.stdout),[]);
x=run(['evidence','validate',evPath,'--json']);assert.equal(x.status,0,x.stderr||x.stdout);assert.equal(JSON.parse(x.stdout).valid,true);
x=run(['evidence','status','--at','2026-09-06T12:00:00.000Z','--json']);assert.equal(x.status,0,x.stderr||x.stdout);assert.equal(JSON.parse(x.stdout).overall_status,'PASS');
// Replace the independent observation with agent self-assertion: verification must no longer pass.
evidence.observations[0].provenance={producer_kind:'agent',producer_id:'coding-agent',verification_method:'self_assertion'};writeFileSync(evPath,JSON.stringify(evidence,null,2));x=run(['verify','--at','2026-09-06T12:00:00.000Z','--json']);assert.equal(x.status,4,x.stderr||x.stdout);assert.equal(JSON.parse(x.stdout).overall_status,'UNKNOWN');
console.log('Intent Evidence Authority CLI tests passed');
