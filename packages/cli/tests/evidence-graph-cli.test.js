/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildWorkspaceEvidenceGraph,renderEvidenceGraphSummary,renderEvidenceTrace,traceEvidenceGraph} from '../src/evidence-graph.js';
import {readFlightState} from '../src/flight-control/store.js';
import {EvidenceRecorder} from '@ruleoak/core';

const grant={grant_version:'1.0',grant_id:'g1',issuer:'user:owner',subject:{type:'agent',id:'agent-a'},principal_chain:[{type:'agent',id:'agent-a'}],capabilities:[{id:'c1',actions:['resource.read'],resources:['**']}],issued_at:'2026-08-27T01:00:00Z',not_before:'2026-08-27T01:00:00Z',expires_at:'2026-08-27T02:00:00Z',parent_grant_id:null,delegation_depth:0};
const state={pending:[],approvals:[],events:[],authority:{grants:[grant],envelopes:[],leases:[],revocations:[]}};
const graph=buildWorkspaceEvidenceGraph(state,{generatedAt:'2026-08-27T01:01:00Z'});
assert.ok(graph.nodes.some(n=>n.node_id==='grant:g1'));
assert.match(renderEvidenceGraphSummary(graph),/Evidence graph/);
const trace=traceEvidenceGraph(graph,'grant:g1');
assert.match(renderEvidenceTrace(trace),/Evidence trace/);

const dir=mkdtempSync(join(tmpdir(),'ruleoak-evidence-cli-'));
mkdirSync(join(dir,'.ruleoak','authority','grants'),{recursive:true});
writeFileSync(join(dir,'.ruleoak','authority','grants','g1.json'),JSON.stringify(grant,null,2));
const cli=new URL('../bin/ruleoak.js',import.meta.url);
let run=spawnSync(process.execPath,[cli.pathname,'evidence','graph','--dir',dir,'--json'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr);const parsed=JSON.parse(run.stdout);assert.equal(parsed.source.evidence_event_count,0);
run=spawnSync(process.execPath,[cli.pathname,'evidence','trace','--dir',dir,'--id','grant:g1','--json'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).target.node_id,'grant:g1');
run=spawnSync(process.execPath,[cli.pathname,'evidence','timeline','--dir',dir,'--kind','grant','--json'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).items.length,1);


const longDir=mkdtempSync(join(tmpdir(),'ruleoak-evidence-long-'));
mkdirSync(join(longDir,'.ruleoak','authority','grants'),{recursive:true});
writeFileSync(join(longDir,'.ruleoak','authority','grants','g1.json'),JSON.stringify(grant,null,2));
const longRecorder=new EvidenceRecorder(join(longDir,'.ruleoak','evidence.jsonl'),{fsync:false});
for(let i=0;i<205;i++)longRecorder.append({type:'test.read',target:'ruleoak://test',arguments:{},metadata:{}},{action:'allow'},new Date(Date.parse('2026-08-27T01:00:00Z')+i*1000).toISOString());
assert.equal(readFlightState(longDir).events.length,200,'default Flight Control state remains bounded');
assert.equal(readFlightState(longDir,{eventLimit:null}).events.length,205,'Evidence Graph can request complete chain');
run=spawnSync(process.execPath,[cli.pathname,'evidence','graph','--dir',longDir,'--json'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).source.evidence_event_count,205);


const malformedDir=mkdtempSync(join(tmpdir(),'ruleoak-evidence-malformed-'));
mkdirSync(join(malformedDir,'.ruleoak'),{recursive:true});
writeFileSync(join(malformedDir,'.ruleoak','evidence.jsonl'),'{"bad":');
let malformedEvidence=false;
try{readFlightState(malformedDir,{eventLimit:null,strictEvidence:true});}catch(error){malformedEvidence=/invalid evidence JSONL line 1/.test(error.message);}
assert.equal(malformedEvidence,true,'strict Evidence Graph state load must reject malformed trailing JSONL');
run=spawnSync(process.execPath,[cli.pathname,'evidence','graph','--dir',malformedDir,'--json'],{encoding:'utf8'});
assert.notEqual(run.status,0,'Evidence Graph CLI must reject malformed recorder JSONL');

console.log('Evidence Graph CLI tests passed');
