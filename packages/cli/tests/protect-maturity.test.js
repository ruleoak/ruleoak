/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EvidenceRecorder } from '@ruleoak/core';
import { applyProtectionSetup, checkProtection, protectionStatus, rollbackProtectionSetup, verifyProtectionRuntimeRouting } from '../src/protect-setup.js';

const root=mkdtempSync(join(tmpdir(),'ruleoak-protect-maturity-'));
mkdirSync(join(root,'.cursor'),{recursive:true});
const server=join(root,'server.mjs');
writeFileSync(server,"process.stdin.resume(); setTimeout(()=>{},10000);\n");
const cfg=join(root,'.cursor','mcp.json');
writeFileSync(cfg,JSON.stringify({mcpServers:{demo:{command:process.execPath,args:[server]}}},null,2));
const cliBin=resolve(fileURLToPath(new URL('../bin/ruleoak.js',import.meta.url)));

const applied=applyProtectionSetup(root,{wrapperCommand:process.execPath,wrapperPrefixArgs:[cliBin]});
assert.equal(applied.routing_configured,true);
assert.match(readFileSync(cfg,'utf8'),/ruleoakManaged/);

const verified=await verifyProtectionRuntimeRouting(root,{timeoutMs:4000});
assert.equal(verified.ok,true);
assert.equal(verified.results[0].status,'ACTIVE_VERIFIED');
let status=protectionStatus(root);
assert.equal(status.active_verified,true);
assert.equal(status.current_config_ok,true);
assert.equal(status.first_value_achieved,false,'route probes are not real protected actions');
assert.ok(status.first_boundary_verified_at);
assert.equal(protectionStatus(root,{server:'demo'}).active_verified,true,'server status may reuse a fresh full-route proof');
const scoped=await verifyProtectionRuntimeRouting(root,{server:'demo',timeoutMs:4000});
assert.equal(scoped.ok,true);
assert.equal(protectionStatus(root).active_verified,true,'a scoped verification must not overwrite the last full-route proof');
const checked=await checkProtection(root,{timeoutMs:4000});
assert.equal(checked.ready,true);assert.equal(checked.state,'READY_POLICY_ONLY');assert.equal(checked.effect_boundary_ready,false);assert.equal(checked.effect_boundary_state,'POLICY_ONLY');assert.equal(checked.status.effect_profile_coverage,0);
const strictChecked=await checkProtection(root,{timeoutMs:4000,requireEffectBoundary:true});assert.equal(strictChecked.route_ready,true);assert.equal(strictChecked.ready,false);assert.equal(strictChecked.state,'READY_POLICY_ONLY');

const recorder=new EvidenceRecorder(resolve(root,'.ruleoak','evidence.jsonl'));
const actionTime=new Date(Date.now()+5).toISOString();
recorder.append({type:'mcp.filesystem.write',target:'file.txt',arguments:{},metadata:{protocol:'mcp-jsonrpc-stdio',jsonrpcId:'real-1'}},{action:'allow',reason:'test protected call',matchedRule:'test'},actionTime);
status=protectionStatus(root);
assert.equal(status.protected_action_count,1);
assert.equal(status.protected_decisions.allow,1);
assert.equal(status.first_value_achieved,true);
assert.equal(status.protected_unique_tools,1);
assert.ok(status.time_to_first_protected_action_ms>=0);

// A current config mutation must invalidate status immediately; the operator should
// not need to run `protect verify` before drift becomes visible.
const drifted=JSON.parse(readFileSync(cfg,'utf8'));
drifted.mcpServers.demo.args=[...drifted.mcpServers.demo.args,'--unexpected-drift'];
writeFileSync(cfg,JSON.stringify(drifted,null,2));
status=protectionStatus(root);
assert.equal(status.current_config_ok,false);
assert.equal(status.active_verified,false);
assert.equal(status.config_drift_count,1);
const driftCheck=await checkProtection(root,{timeoutMs:1000});
assert.equal(driftCheck.ready,false);assert.equal(driftCheck.state,'ATTENTION');assert.ok(driftCheck.reasons.some(x=>x.includes('configuration')));

const drift=await verifyProtectionRuntimeRouting(root,{timeoutMs:1000});
assert.equal(drift.ok,false);
assert.equal(drift.results[0].status,'CONFIG_DRIFTED');
const rolled=rollbackProtectionSetup(root);
assert.equal(rolled.ok,true);
assert.equal(JSON.parse(readFileSync(cfg,'utf8')).mcpServers.demo.command,process.execPath);
console.log('Protect maturity tests passed');
