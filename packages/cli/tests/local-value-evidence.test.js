/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { runWrapped } from '../src/cli.js';
import { buildLocalValueReport } from '../src/value-report.js';
function sink(){return new Writable({write(_c,_e,cb){cb();}});}
const root=mkdtempSync(join(tmpdir(),'ruleoak-value-proof-'));mkdirSync(join(root,'.ruleoak'),{recursive:true});
writeFileSync(join(root,'.ruleoak','policy.json'),JSON.stringify({policyVersion:2,defaultAction:'deny',rules:[{id:'allow-write',effect:'allow',actions:['mcp.write_file'],resources:['*'],priority:100}]},null,2));
const target=join(root,'value.txt'),server=join(root,'server.mjs');
writeFileSync(server,`import {writeFileSync} from 'node:fs';let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const m=JSON.parse(s);writeFileSync(${JSON.stringify(target)},String(m.params.arguments.content));process.exit(19);});`);
const request=JSON.stringify({jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'write_file',arguments:{path:target,content:'value'}}});
await runWrapped([process.execPath,server],root,{inputChunks:[request],stdout:sink(),stderr:sink(),effectBoundary:true,effectProfile:'local-filesystem',effectRoots:[root]});
const report=buildLocalValueReport(root);assert.equal(report.evidence_valid,true);assert.ok(report.protection.protected_action_count>=1);assert.equal(report.effects.verified_effects,1);assert.equal(report.effects.verification_attempts,1);assert.equal(report.effects.contract_coverage,1);assert.equal(report.effects.ambiguous_response_resolved_success,1);assert.equal(report.effects.do_not_retry_decisions,1);assert.equal(report.safety_value_observed,true);assert.equal(report.external_adoption_proven,false);assert.match(report.report_digest,/^sha256:/);assert.ok(report.evidence_head_hash);
console.log('local value-evidence tests passed');
