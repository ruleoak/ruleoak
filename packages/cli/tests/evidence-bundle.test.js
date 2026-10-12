/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EvidenceRecorder} from '@ruleoak/core';
import {createEvidenceBundle,initProject} from '../src/cli.js';
import {verifyEvidenceBundleFile} from '../src/workstation.js';

const dir=mkdtempSync(join(tmpdir(),'ruleoak-bundle-'));
try{
  initProject(dir,{policyPack:'cautious'});
  const evidenceFile=join(dir,'.ruleoak','evidence.jsonl');
  const recorder=new EvidenceRecorder(evidenceFile);
  recorder.append({type:'filesystem.read',target:'./private/SECRET_TARGET',arguments:{token:'SUPER_SECRET_BUNDLE_MARKER'},metadata:{}},{action:'allow',risk:'low',reason:'private reason should not enter minimal bundle',matchedRule:'allow-read'},'2026-08-27T01:00:00.000Z');
  mkdirSync(join(dir,'.ruleoak','pending'),{recursive:true});
  writeFileSync(join(dir,'.ruleoak','pending','private.json'),JSON.stringify({private:'FORENSIC_ONLY_MARKER'}));
  const reportPath=join(dir,'.ruleoak','report.html');
  assert.equal(existsSync(reportPath),false);

  const createdAt='2026-08-27T01:01:00.000Z';
  const minimal1=createEvidenceBundle(dir,join(dir,'minimal-1.zip'),{profile:'minimal',createdAt});
  const minimal2=createEvidenceBundle(dir,join(dir,'minimal-2.zip'),{profile:'minimal',createdAt});
  assert.equal(minimal1.manifest.bundle_version,'3.0');
  assert.equal(minimal1.manifest.privacy_profile,'minimal');
  assert.equal(minimal1.manifest.bundle_id,minimal2.manifest.bundle_id);
  assert.deepEqual(readFileSync(minimal1.outPath),readFileSync(minimal2.outPath),'same source/profile/time must produce byte-identical bundles');
  assert.equal(existsSync(reportPath),false,'bundle export must not mutate workspace by generating report.html');
  const minBytes=readFileSync(minimal1.outPath).toString('utf8');
  assert.ok(!minBytes.includes('SUPER_SECRET_BUNDLE_MARKER'));
  assert.ok(!minBytes.includes('SECRET_TARGET'));
  assert.ok(!minBytes.includes('FORENSIC_ONLY_MARKER'));
  const minVerify=verifyEvidenceBundleFile(minimal1.outPath);
  assert.equal(minVerify.ok,true,minVerify.errors.join('; '));
  assert.equal(minVerify.sourceChainVerification,'verified_at_export_only');
  assert.equal(minVerify.metadata.source.raw_evidence_included,false);

  const operational=createEvidenceBundle(dir,join(dir,'operational.zip'),{profile:'operational',createdAt});
  const opVerify=verifyEvidenceBundleFile(operational.outPath);
  assert.equal(opVerify.ok,true,opVerify.errors.join('; '));
  assert.equal(opVerify.sourceChainVerification,'reverified_from_bundle');
  assert.equal(opVerify.metadata.source.raw_evidence_included,true);
  assert.ok(readFileSync(operational.outPath).toString('utf8').includes('SUPER_SECRET_BUNDLE_MARKER'),'operational is explicit higher-detail raw evidence');
  assert.ok(!readFileSync(operational.outPath).toString('utf8').includes('FORENSIC_ONLY_MARKER'),'operational must omit approval state');

  const forensic=createEvidenceBundle(dir,join(dir,'forensic.zip'),{profile:'forensic_local',createdAt});
  const forensicVerify=verifyEvidenceBundleFile(forensic.outPath);
  assert.equal(forensicVerify.ok,true,forensicVerify.errors.join('; '));
  assert.ok(readFileSync(forensic.outPath).toString('utf8').includes('FORENSIC_ONLY_MARKER'));
  assert.equal(forensic.manifest.privacy.includes_approval_state,true);

  const tampered=Buffer.from(readFileSync(minimal1.outPath));
  const needle=Buffer.from('"source_index":1');const at=tampered.indexOf(needle);assert.ok(at>=0);tampered[at+needle.length-1]=0x32;writeFileSync(join(dir,'tampered.zip'),tampered);
  const bad=verifyEvidenceBundleFile(join(dir,'tampered.zip'));
  assert.equal(bad.ok,false);assert.ok(bad.errors.some(e=>/digest mismatch/.test(e)));

  console.log('Evidence Bundle & Sink CLI tests passed');
}finally{rmSync(dir,{recursive:true,force:true});}
