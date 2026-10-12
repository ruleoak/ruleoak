/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildAuthorityGrant } from '@ruleoak/core';
import { writeAuthorityArtifact, readFlightState } from '../src/flight-control/store.js';

const dir=mkdtempSync(join(tmpdir(),'ruleoak-delegate-cli-'));mkdirSync(join(dir,'.ruleoak'),{recursive:true});
const secret='cli-delegation-secret';
const issuedAt=new Date();
issuedAt.setSeconds(issuedAt.getSeconds()-5);
const expiresAt=new Date(issuedAt.getTime()+(60*60*1000));
const now=issuedAt.toISOString();
const root=buildAuthorityGrant({grant_version:'1.1',issuer:'user:owner',subject:{type:'agent',id:'agent-root'},principal_chain:[{type:'agent',id:'agent-root'}],capabilities:[{actions:['resource.write'],resources:['ruleoak://file/project/**']}],issued_at:now,not_before:now,expires_at:expiresAt.toISOString(),delegation_depth:0,ancestor_grant_ids:[],budget:{max_executions:3,max_objects:9},obligations:[{type:'require_effect_receipt'}],delegation:{allowed:true,max_depth:2,budget_mode:'partition'}},{secret,issuedAt:now});
writeAuthorityArtifact(dir,'grant',root.grant_id,root);
const cli=fileURLToPath(new URL('../bin/ruleoak.js',import.meta.url));
const run=spawnSync(process.execPath,[cli,'authority','delegate','--dir',dir,'--parent',root.grant_id,'--subject-id','svc-child','--subject-type','service','--action','resource.write','--resource','ruleoak://file/project/build/**','--max-executions','1','--max-objects','3','--budget-mode','partition','--json'],{encoding:'utf8',env:{...process.env,RULEOAK_AUTHORITY_SECRET:secret}});
assert.equal(run.status,0,run.stderr||run.stdout);
const out=JSON.parse(run.stdout);assert.equal(out.grant.grant_version,'1.1');assert.equal(out.grant.subject.type,'service');assert.deepEqual(out.grant.ancestor_grant_ids,[root.grant_id]);assert.equal(out.grant.obligations.some(x=>x.type==='require_effect_receipt'),true);assert.ok(out.budget_allocation);
const state=readFlightState(dir);assert.equal(state.authority.grants.length,2);
const revoke=spawnSync(process.execPath,[cli,'authority','revoke','--dir',dir,'--type','authority_grant','--id',root.grant_id,'--reason','owner stop','--json'],{encoding:'utf8'});assert.equal(revoke.status,0,revoke.stderr||revoke.stdout);
const second=spawnSync(process.execPath,[cli,'authority','delegate','--dir',dir,'--parent',root.grant_id,'--subject-id','blocked','--subject-type','agent','--action','resource.write','--resource','ruleoak://file/project/x/**','--max-executions','1','--max-objects','1','--budget-mode','partition','--json'],{encoding:'utf8',env:{...process.env,RULEOAK_AUTHORITY_SECRET:secret}});
assert.notEqual(second.status,0);assert.match(second.stderr+second.stdout,/revoked|not active/i);
console.log('Delegation & Revocation CLI tests passed');
