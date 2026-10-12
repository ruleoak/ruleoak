#!/usr/bin/env node
/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort(cmp).map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const sha256=text=>`sha256:${createHash('sha256').update(text).digest('hex')}`;
function args(argv){const out={format:'human',implementation:null};for(let i=0;i<argv.length;i++){if(argv[i]==='--implementation')out.implementation=argv[++i];else if(argv[i]==='--format')out.format=argv[++i];else throw new Error(`unknown argument: ${argv[i]}`);}if(!out.implementation)throw new Error('--implementation <module> is required');if(!['human','json'].includes(out.format))throw new Error('--format must be human or json');return out;}
function loadJson(path){return JSON.parse(readFileSync(path,'utf8'));}
function vectorFiles(){return readdirSync(resolve(here,'vectors')).filter(name=>name.endsWith('.json')).sort(cmp).map(name=>resolve(here,'vectors',name));}
async function main(){
  const options=args(process.argv.slice(2));
  const manifest=loadJson(resolve(here,'manifest.json'));
  const files=vectorFiles();
  const matrixText=readFileSync(resolve(here,'version-matrix.json'),'utf8');
  const matrixOk=manifest.version_matrix_sha256===sha256(matrixText);
  const manifestFiles=new Map(manifest.files.map(row=>[row.path,row]));
  const packaging=[];
  for(const file of files){const rel=`vectors/${file.split('/').at(-1)}`;const text=readFileSync(file,'utf8');const row=manifestFiles.get(rel);packaging.push({path:rel,ok:Boolean(row)&&row.sha256===sha256(text)});}
  const implementationUrl=options.implementation.startsWith('file:')?options.implementation:pathToFileURL(resolve(process.cwd(),options.implementation)).href;
  const implementation=await import(implementationUrl);
  if(typeof implementation.validate!=='function')throw new Error('implementation module must export validate(contractId,input)');
  if(typeof implementation.canonicalize!=='function')throw new Error('implementation module must export canonicalize(value)');
  const results=[];
  for(const file of files){const vector=loadJson(file);for(const test of vector.cases){
    let actualValid=false,error=null,actualCanonical=null;
    try{const raw=await implementation.validate(vector.contract_id,structuredClone(test.input));actualValid=typeof raw==='boolean'?raw:Boolean(raw?.valid??raw?.ok);if(test.expectation==='valid')actualCanonical=await implementation.canonicalize(structuredClone(test.input));}catch(e){error=String(e?.message||e);}
    const validityOk=actualValid===(test.expectation==='valid');
    const canonicalOk=test.expectation!=='valid'||actualCanonical===test.canonical_json;
    results.push({contract_id:vector.contract_id,case_id:test.case_id,expectation:test.expectation,validity_ok:validityOk,canonical_ok:canonicalOk,error});
  }}
  packaging.unshift({path:'version-matrix.json',ok:matrixOk});
  const ok=packaging.every(row=>row.ok)&&results.every(row=>row.validity_ok&&row.canonical_ok&&!row.error);
  const report={conformance_version:manifest.conformance_version,implementation_id:String(implementation.implementation_id||'unknown'),implementation_version:String(implementation.implementation_version||'unknown'),status:ok?'PASS':'FAIL',packaging,results};
  if(options.format==='json')process.stdout.write(`${JSON.stringify(report,null,2)}\n`);else{
    process.stdout.write(`RuleOak Public Protocol Conformance ${report.conformance_version}: ${report.status}\n`);
    process.stdout.write(`implementation: ${report.implementation_id} ${report.implementation_version}\n`);
    for(const row of results)process.stdout.write(`${row.validity_ok&&row.canonical_ok&&!row.error?'PASS':'FAIL'} ${row.case_id}\n`);
  }
  process.exitCode=ok?0:2;
}
main().catch(error=>{console.error(error.message);process.exitCode=64;});
