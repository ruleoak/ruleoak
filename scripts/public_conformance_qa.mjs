/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const REQUIRED=Object.freeze(['adapter_descriptor','approval_result','authority_envelope','authority_grant','capability_identity_evidence','crashlab_scenario','delegation','effect_receipt','evidence_bundle','execution_lease','revocation']);
const sha256=b=>`sha256:${createHash('sha256').update(b).digest('hex')}`;
const cmp=(a,b)=>a<b?-1:a>b?1:0;
export function validatePublicConformanceKit({root=process.cwd()}={}){
  const errors=[], base=resolve(root,'packages/protocol/conformance'), vectorsDir=resolve(base,'vectors');
  const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
  const currentRelease=read(resolve(root,'package.json')).version;
  let manifest={},matrix={};
  try{manifest=read(resolve(base,'manifest.json'));}catch(e){errors.push(`conformance manifest: ${e.message}`);}
  try{matrix=read(resolve(base,'version-matrix.json'));}catch(e){errors.push(`conformance version matrix: ${e.message}`);}
  const files=existsSync(vectorsDir)?readdirSync(vectorsDir).filter(x=>x.endsWith('.json')).sort(cmp):[];
  const ids=[]; let cases=0;
  for(const name of files){
    let vector;try{vector=read(resolve(vectorsDir,name));}catch(e){errors.push(`conformance vector ${name}: ${e.message}`);continue;}
    ids.push(vector.contract_id); cases+=(vector.cases||[]).length;
    if(vector.vector_version!=='1.0')errors.push(`${name}: vector_version must be 1.0`);
    if(!Array.isArray(vector.contract_versions)||!vector.contract_versions.length)errors.push(`${name}: contract_versions required`);
    const valid=(vector.cases||[]).filter(x=>x.expectation==='valid'),invalid=(vector.cases||[]).filter(x=>x.expectation==='invalid');
    if(!valid.length||!invalid.length)errors.push(`${name}: must include valid and invalid cases`);
    for(const row of valid)if(typeof row.canonical_json!=='string'||!row.canonical_json.length)errors.push(`${name}:${row.case_id||'<case>'}: valid case missing canonical_json`);
    if(vector.contract_id==='revocation'&&valid[0]){const record=valid[0].input||{}, {record_digest:_ignored,...payload}=record;const actual=sha256(Buffer.from(JSON.stringify(payload,Object.keys(payload).sort()))); /* overridden below by canonical helper */ const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort(cmp).map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);if(record.record_digest!==sha256(Buffer.from(canonical(payload))))errors.push(`${name}: valid revocation record_digest does not match canonical payload`);}
  }
  if(JSON.stringify([...ids].sort(cmp))!==JSON.stringify([...REQUIRED]))errors.push(`conformance vector contract set mismatch: ${ids.sort(cmp).join(',')}`);
  if(manifest.conformance_version!=='1.0'||manifest.ruleoak_release!==currentRelease)errors.push('conformance manifest release/version identity mismatch');
  if(manifest.vector_count!==REQUIRED.length)errors.push('conformance manifest vector_count mismatch');
  const matrixBytes=readFileSync(resolve(base,'version-matrix.json'));if(manifest.version_matrix_sha256!==sha256(matrixBytes))errors.push('conformance version matrix SHA-256 mismatch');
  const mf=new Map((manifest.files||[]).map(x=>[x.path,x.sha256]));
  for(const name of files){const path=`vectors/${name}`,bytes=readFileSync(resolve(vectorsDir,name));if(mf.get(path)!==sha256(bytes))errors.push(`${path}: manifest SHA-256 mismatch`);}
  if(mf.size!==files.length)errors.push('conformance manifest file inventory mismatch');
  const matrixIds=(matrix.contracts||[]).map(x=>x.contract_id).sort(cmp);
  if(matrix.matrix_version!=='1.0'||matrix.ruleoak_release!==currentRelease||JSON.stringify(matrixIds)!==JSON.stringify([...REQUIRED]))errors.push('conformance version matrix contract/release mismatch');
  const runnerPath=resolve(base,'runner.mjs');
  if(!existsSync(runnerPath))errors.push('conformance runner missing'); else {const text=readFileSync(runnerPath,'utf8');for(const forbidden of ['@ruleoak/core','@ruleoak/protocol','ruleoak-reference'])if(text.includes(forbidden))errors.push(`conformance runner has implementation dependency: ${forbidden}`);}
  for(const p of ['packages/protocol/schemas/adapter-descriptor.schema.json','packages/protocol/schemas/revocation-record.schema.json'])if(!existsSync(resolve(root,p)))errors.push(`conformance public schema missing: ${p}`);
  try{const pkg=read(resolve(root,'packages/protocol/package.json'));if(!(pkg.files||[]).includes('conformance'))errors.push('@ruleoak/protocol package files omit conformance');if(!Object.keys(pkg.exports||{}).some(k=>k.startsWith('./conformance')))errors.push('@ruleoak/protocol exports omit conformance');}catch(e){errors.push(`protocol package metadata: ${e.message}`);}
  return {errors,contractCount:ids.length,caseCount:cases};
}
if(import.meta.url===new URL(`file://${process.argv[1]}`).href){const r=validatePublicConformanceKit();if(r.errors.length){console.error(`public conformance QA FAILED (${r.errors.length})`);for(const e of r.errors)console.error(`- ${e}`);process.exit(1);}console.log(`public conformance QA PASS: ${r.contractCount} contracts, ${r.caseCount} vector cases`);}
