/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const repo=resolve(new URL('../../..',import.meta.url).pathname);const cli=resolve(repo,'packages/cli/bin/ruleoak.js'),root=mkdtempSync(join(tmpdir(),'ruleoak-semantic-diff-cli-'));
const manifest={intent_manifest_version:'0.1',manifest_id:'manifest.cli',product:{id:'product.cli',name:'CLI'},capabilities:[{id:'cap.cli',evidence_requirement_ids:['evidence.cli']}],evidence_requirements:[{id:'evidence.cli',statement:'CLI evidence',evidence_types:['unit'],capability_ids:['cap.cli']}]};
function dir(name,text){const d=join(root,name);mkdirSync(join(d,'.ruleoak','intent'),{recursive:true});mkdirSync(join(d,'src'),{recursive:true});writeFileSync(join(d,'.ruleoak','intent','cli.intent.json'),JSON.stringify(manifest));writeFileSync(join(d,'.ruleoak','intent','cli.binding.json'),JSON.stringify({binding_version:'0.1',intent_manifest_id:'manifest.cli',implementation_id:'impl.cli',language:'JavaScript',capability_bindings:[{capability_id:'cap.cli',modules:['src/a.js']}]}));writeFileSync(join(d,'src','a.js'),text);return d;}
const a=dir('a','export const a=1;\n'),b=dir('b','export const a=2;\n');
const out=execFileSync(process.execPath,[cli,'diff','--semantic',a,b,'--json'],{encoding:'utf8'});const r=JSON.parse(out);assert.equal(r.semantic_diff_version,'0.1');assert.equal(r.summary.intent_changed,false);assert.ok(r.capability_changes.some(x=>x.capability_id==='cap.cli'));assert.ok(r.uncertainties.some(x=>x.code==='implementation_without_intent_delta'));

const gitDir=dir('git','export const a=1;\n');
execFileSync('git',['init','-q'],{cwd:gitDir});execFileSync('git',['config','user.email','semantic-diff@example.invalid'],{cwd:gitDir});execFileSync('git',['config','user.name','Semantic Diff'],{cwd:gitDir});execFileSync('git',['add','.'],{cwd:gitDir});execFileSync('git',['commit','-qm','base'],{cwd:gitDir});writeFileSync(join(gitDir,'src','a.js'),'export const a=4;\n');
const gitOut=execFileSync(process.execPath,[cli,'diff','--semantic','--dir',gitDir,'--json'],{encoding:'utf8'});const g=JSON.parse(gitOut);assert.equal(g.base.label,'HEAD');assert.equal(g.candidate.label,'WORKTREE');assert.ok(g.implementation_changes.some(x=>x.path==='src/a.js'));
console.log('Semantic Diff CLI tests passed');
