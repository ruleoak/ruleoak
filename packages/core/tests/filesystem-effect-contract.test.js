/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inferFilesystemEffectContract, inferMcpEffectContract, verifyFilesystemPostcondition } from '../src/index.js';

const root=mkdtempSync(join(tmpdir(),'ruleoak-effect-contract-'));
const target=join(root,'file.txt');writeFileSync(target,'before');
const contract=inferMcpEffectContract({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'write_file',arguments:{path:target,content:'after'}}});
assert.equal(contract.operation,'write');assert.ok(contract.verifier_spec.expected.before.digest);
writeFileSync(target,'after');
let verified=verifyFilesystemPostcondition(contract.verifier_spec,contract.verifier_spec);
assert.equal(verified.state,'confirmed_success');

writeFileSync(target,'before');
const noEffect=inferFilesystemEffectContract({operation:'write_file',path:target,content:'after',idempotent:true});
verified=verifyFilesystemPostcondition(noEffect.verifier_spec,noEffect.verifier_spec);
assert.equal(verified.state,'confirmed_failure');assert.equal(verified.evidence.effect_applied,false);assert.equal(verified.evidence.retry_safe,true);

const src=join(root,'src.txt'),dst=join(root,'dst.txt');writeFileSync(src,'move-me');
const move=inferMcpEffectContract({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'move_file',arguments:{source:src,destination:dst}}});
renameSync(src,dst);verified=verifyFilesystemPostcondition(move.verifier_spec,move.verifier_spec);assert.equal(verified.state,'confirmed_success');

const editPath=join(root,'edit.txt');writeFileSync(editPath,'alpha beta gamma');
const edit=inferMcpEffectContract({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'edit_file',arguments:{path:editPath,edits:[{oldText:'beta',newText:'BETA'}]}}});
assert.ok(edit);writeFileSync(editPath,'alpha BETA gamma');verified=verifyFilesystemPostcondition(edit.verifier_spec,edit.verifier_spec);assert.equal(verified.state,'confirmed_success');

const deletePath=join(root,'delete.txt');writeFileSync(deletePath,'original');
const del=inferFilesystemEffectContract({operation:'delete_file',path:deletePath});
rmSync(deletePath);writeFileSync(deletePath,'recreated');verified=verifyFilesystemPostcondition(del.verifier_spec,del.verifier_spec);assert.equal(verified.state,'partial_or_ambiguous','delete/recreate race must not be misclassified as no effect');



// A write whose target disappears after starting from an existing file is not
// proof that no effect occurred; it may have been written then removed by a
// competing actor. Safe retry must remain fail-closed.
const vanished=join(root,'vanished.txt');writeFileSync(vanished,'old');
const vanishedContract=inferFilesystemEffectContract({operation:'write_file',path:vanished,content:'new',idempotent:true});
rmSync(vanished);verified=verifyFilesystemPostcondition(vanishedContract.verifier_spec,vanishedContract.verifier_spec);
assert.equal(verified.state,'partial_or_ambiguous');assert.equal(verified.evidence.retry_safe,false);

// Symlink targets are intentionally not auto-inferred: hashing/following a link
// would silently change the authority/effect target being verified.
if(process.platform!=='win32') {const real=join(root,'real.txt'),link=join(root,'link.txt');writeFileSync(real,'real');symlinkSync(real,link);assert.equal(inferFilesystemEffectContract({operation:'write_file',path:link,content:'new'}),null);}


// Reviewed effect roots are a hard boundary for automatic certainty.
const outside=join(tmpdir(),'ruleoak-effect-outside.txt');
assert.equal(inferFilesystemEffectContract({operation:'write_file',path:outside,content:'x'},{allowedRoots:[root]}),null);
const scoped=inferFilesystemEffectContract({operation:'write_file',path:target,content:'scoped'},{allowedRoots:[root]});
assert.equal(scoped.path_guard.allowed_root,root);
// If path resolution changes after dispatch (for example via a symlinked parent),
// verification must become ambiguous instead of certifying a different target.
if(process.platform!=='win32') {
  const a=join(root,'a'),b=join(root,'b'),linkDir=join(root,'dirlink');mkdirSync(a);mkdirSync(b);
  symlinkSync(a,linkDir,'dir');const linkTarget=join(linkDir,'x.txt');
  const scopedLink=inferFilesystemEffectContract({operation:'write_file',path:linkTarget,content:'x'},{allowedRoots:[root]});
  assert.ok(scopedLink);rmSync(linkDir);symlinkSync(b,linkDir,'dir');writeFileSync(join(b,'x.txt'),'x');
  const rebound=verifyFilesystemPostcondition(scopedLink.verifier_spec,scopedLink.verifier_spec);assert.equal(rebound.state,'partial_or_ambiguous');
}

assert.equal(readFileSync(editPath,'utf8'),'alpha BETA gamma');
console.log('filesystem effect-contract tests passed');
