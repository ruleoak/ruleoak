/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const readJson=p=>JSON.parse(readFileSync(p,'utf8'));
const cmp=(a,b)=>a<b?-1:a>b?1:0;
function declarationNames(text){return new Set([...text.matchAll(/\bexport\s+(?:declare\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]));}
function declarationSnippet(text,name){
  let m=text.match(new RegExp(`\\bexport\\s+(?:declare\\s+)?(?:const|function)\\s+${name}\\b`));
  if(m){const start=m.index,end=text.indexOf(';',start);if(end>=0)return text.slice(start,end+1).replace(/\s+/g,' ').trim();}
  m=text.match(new RegExp(`\\bexport\\s+(?:declare\\s+)?class\\s+${name}\\b`));
  if(m){const start=m.index,brace=text.indexOf('{',start);if(brace>=0){let depth=0;for(let i=brace;i<text.length;i++){if(text[i]==='{')depth++;else if(text[i]==='}'&&--depth===0)return text.slice(start,i+1).replace(/\s+/g,' ').trim();}}}
  return null;
}
const digestText=text=>`sha256:${createHash('sha256').update(text).digest('hex')}`;
function hasCliCommand(text,command){if(command==='version')return text.includes("command === 'version'")||text.includes("command === '--version'");return text.includes(`command === '${command}'`)||text.includes(`ruleoak ${command}`);}
function sameSet(a,b){return JSON.stringify([...a].sort(cmp))===JSON.stringify([...b].sort(cmp));}
function snapshotStableItems(snapshot){return {exports:new Set(Object.entries(snapshot.stable_exports||{}).flatMap(([pkg,names])=>names.map(name=>`${pkg}:${name}`))),commands:new Set(snapshot.stable_cli_commands||[]),formats:new Set(snapshot.stable_file_formats||[]),contracts:new Set(Object.entries(snapshot.stable_protocol_contracts||{}).flatMap(([id,versions])=>versions.map(v=>`${id}:${v}`))),spi:new Set(snapshot.stable_extension_spi_versions||[])};}

export async function validatePublicApiStability(options={}){
  const root=resolve(options.root||process.cwd());
  const registryPath=resolve(root,options.registry||'packages/protocol/stability/api-maturity.json');
  const snapshotPath=resolve(root,options.snapshot||'packages/protocol/stability/stable-api-snapshot.json');
  const compatPath=resolve(root,options.compatibility||'packages/protocol/stability/compatibility-matrix.json');
  const errors=[];
  for(const p of [registryPath,snapshotPath,compatPath])if(!existsSync(p))errors.push(`API stability file missing: ${p}`);
  if(errors.length)return {errors,stableExportCount:0,stableContractCount:0};
  const registry=readJson(registryPath),snapshot=readJson(snapshotPath),compat=readJson(compatPath),rootPkg=readJson(resolve(root,'package.json'));
  const version=rootPkg.version;
  if(registry.registry_version!=='1.0'||registry.ruleoak_release!==version)errors.push('API maturity registry release/version identity mismatch');
  if(snapshot.snapshot_version!=='1.0'||snapshot.ruleoak_release!==version)errors.push('stable API snapshot release/version identity mismatch');
  if(compat.matrix_version!=='1.0'||compat.ruleoak_release!==version)errors.push('compatibility matrix release/version identity mismatch');
  const historyManifestPath=resolve(root,'packages/protocol/stability/history-manifest.json');
  if(!existsSync(historyManifestPath))errors.push('stability history manifest missing');
  else{
    const historyManifest=readJson(historyManifestPath);const currentItems=snapshotStableItems(snapshot);
    if(historyManifest.history_version!=='1.0'||!Array.isArray(historyManifest.snapshots)||historyManifest.snapshots.length===0)errors.push('stability history manifest invalid');
    for(const row of historyManifest.snapshots||[]){
      const hp=resolve(root,'packages/protocol/stability',row.path||'');if(!existsSync(hp)){errors.push(`historical stability floor missing: ${row.path}`);continue;}
      const bytes=readFileSync(hp);const digest=`sha256:${createHash('sha256').update(bytes).digest('hex')}`;if(digest!==row.sha256)errors.push(`historical stability floor hash mismatch: ${row.path}`);
      let old;try{old=JSON.parse(bytes);}catch(error){errors.push(`historical stability floor invalid JSON ${row.path}: ${error.message}`);continue;}
      const oldItems=snapshotStableItems(old);for(const [kind,set] of Object.entries(oldItems))for(const item of set)if(!currentItems[kind].has(item))errors.push(`stable ${kind} item removed from historical floor ${row.ruleoak_release}: ${item}`);
    }
  }
  if(JSON.stringify(registry.maturity_levels)!==JSON.stringify(['experimental','preview','stable']))errors.push('API maturity levels must be experimental, preview, stable');
  if(registry.one_point_zero?.declared!==false||compat.one_point_zero_declared!==false)errors.push('v0.50 must not declare RuleOak 1.0');
  if(!Array.isArray(registry.one_point_zero?.remaining_gates)||registry.one_point_zero.remaining_gates.length!==4)errors.push('1.0 readiness gates must remain explicit');

  const packageMap={'@ruleoak/protocol':'packages/protocol','@ruleoak/core':'packages/core','@ruleoak/cli':'packages/cli'};
  for(const [name,dir] of Object.entries(packageMap)){
    const p=readJson(resolve(root,dir,'package.json'));
    if(p.version!==version)errors.push(`${name}: package version mismatch`);
    const meta=registry.packages?.[name];
    if(!meta||!registry.maturity_levels.includes(meta.maturity))errors.push(`${name}: package maturity missing/invalid`);
    for(const ep of meta?.entrypoints||[])if(!(ep in (p.exports||{})))errors.push(`${name}: registered entrypoint missing from package exports: ${ep}`);
    if(!sameSet(Object.keys(p.exports||{}),meta?.entrypoints||[]))errors.push(`${name}: package export entrypoints are not completely maturity-registered`);
  }

  const decls={
    '@ruleoak/protocol':declarationNames(readFileSync(resolve(root,'packages/protocol/src/index.d.ts'),'utf8')),
    '@ruleoak/core':declarationNames(readFileSync(resolve(root,'packages/core/src/index.d.ts'),'utf8'))
  };
  for(const [pkg,meta] of Object.entries(registry.exports||{})){
    if(!decls[pkg]){errors.push(`${pkg}: export maturity registry has no declaration source`);continue;}
    if(!registry.maturity_levels.includes(meta.default_maturity))errors.push(`${pkg}: default export maturity invalid`);
    for(const level of ['stable','experimental'])for(const name of meta[level]||[])if(!decls[pkg].has(name))errors.push(`${pkg}: ${level} export missing from declarations: ${name}`);
    const overlap=(meta.stable||[]).filter(x=>(meta.experimental||[]).includes(x));if(overlap.length)errors.push(`${pkg}: exports have conflicting maturity: ${overlap.join(',')}`);
  }

  let stableExportCount=0;
  for(const [pkg,names] of Object.entries(snapshot.stable_exports||{}))for(const name of names){stableExportCount++;if(!decls[pkg]?.has(name))errors.push(`${pkg}: stable API removed from declarations: ${name}`);if(!(registry.exports?.[pkg]?.stable||[]).includes(name))errors.push(`${pkg}: stable snapshot export lost stable maturity: ${name}`);}
  const declarationTexts={'@ruleoak/protocol':readFileSync(resolve(root,'packages/protocol/src/index.d.ts'),'utf8'),'@ruleoak/core':readFileSync(resolve(root,'packages/core/src/index.d.ts'),'utf8')};
  for(const [pkg,items] of Object.entries(snapshot.stable_declaration_fingerprints||{}))for(const [name,expected] of Object.entries(items)){const snippet=declarationSnippet(declarationTexts[pkg]||'',name);if(!snippet)errors.push(`${pkg}: stable declaration missing for fingerprint: ${name}`);else if(digestText(snippet)!==expected)errors.push(`${pkg}: stable declaration fingerprint changed: ${name}`);}

  for(const [pkg,entries] of Object.entries(snapshot.stable_packages||{})){
    const p=readJson(resolve(root,packageMap[pkg],'package.json'));for(const ep of entries)if(!(ep in (p.exports||{})))errors.push(`${pkg}: stable package entrypoint removed: ${ep}`);
  }

  const cliText=readFileSync(resolve(root,'packages/cli/src/cli.js'),'utf8');
  for(const [command,maturity] of Object.entries(registry.cli_commands||{})){if(!registry.maturity_levels.includes(maturity))errors.push(`CLI ${command}: invalid maturity`);if(!hasCliCommand(cliText,command))errors.push(`CLI maturity registry references missing command: ${command}`);}
  const actualCliCommands=new Set([...cliText.matchAll(/command\s*===\s*['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(x=>!x.startsWith('-')));actualCliCommands.add('version');
  if(!sameSet(actualCliCommands,Object.keys(registry.cli_commands||{})))errors.push(`CLI maturity coverage mismatch: runtime=${[...actualCliCommands].sort(cmp).join(',')} registry=${Object.keys(registry.cli_commands||{}).sort(cmp).join(',')}`);
  for(const command of snapshot.stable_cli_commands||[]){if(registry.cli_commands?.[command]!=='stable')errors.push(`CLI stable command lost stable maturity: ${command}`);if(!hasCliCommand(cliText,command))errors.push(`CLI stable command removed: ${command}`);}

  const conformance=readJson(resolve(root,'packages/protocol/conformance/version-matrix.json'));
  const conformanceMap=new Map((conformance.contracts||[]).map(x=>[x.contract_id,x.versions||[]]));
  let stableContractCount=0;
  for(const [id,versions] of Object.entries(snapshot.stable_protocol_contracts||{})){
    stableContractCount++;
    const current=conformanceMap.get(id)||[];
    for(const v of versions)if(!current.includes(v))errors.push(`stable protocol contract ${id}: version removed: ${v}`);
    if(registry.protocol_contracts?.[id]?.maturity!=='stable')errors.push(`stable protocol contract ${id}: maturity downgraded`);
  }

  for(const v of snapshot.stable_extension_spi_versions||[])if(!(registry.extension_spi?.versions||[]).includes(v))errors.push(`stable Extension SPI version removed: ${v}`);
  if(registry.extension_spi?.maturity!=='stable')errors.push('Extension SPI stable maturity lost');
  for(const path of snapshot.stable_file_formats||[])if(!existsSync(resolve(root,path)))errors.push(`stable file format removed: ${path}`);
  for(const [name,meta] of Object.entries(registry.file_formats||{})){if(!registry.maturity_levels.includes(meta.maturity))errors.push(`file format ${name}: invalid maturity`);if(!existsSync(resolve(root,meta.path)))errors.push(`file format ${name}: missing ${meta.path}`);}
  const schemaNames=readdirSync(resolve(root,'packages/protocol/schemas')).filter(x=>x.endsWith('.json')).sort(cmp);if(!sameSet(schemaNames,Object.keys(registry.file_formats||{})))errors.push('protocol schema maturity coverage mismatch');
  const protocolSource=readFileSync(resolve(root,'packages/protocol/src/index.js'),'utf8');const runtimeVersionExports=new Set([...protocolSource.matchAll(/export const ([A-Z0-9_]+_VERSIONS)\s*=/g)].map(m=>m[1]));runtimeVersionExports.delete('EXTENSION_SPI_VERSIONS');const registeredVersionExports=new Set(Object.values(registry.protocol_contracts||{}).flatMap(x=>x.version_exports||[]));if(!sameSet(runtimeVersionExports,registeredVersionExports))errors.push(`protocol version-contract maturity coverage mismatch: runtime=${[...runtimeVersionExports].sort(cmp).join(',')} registry=${[...registeredVersionExports].sort(cmp).join(',')}`);

  const dts=readFileSync(resolve(root,'packages/core/src/index.d.ts'),'utf8');
  const recorder=readFileSync(resolve(root,'packages/core/src/protocol/recorder.js'),'utf8');
  for(const [api,dep] of Object.entries(registry.deprecations||{})){
    if(!dep.since||!dep.replacement||!dep.warning_code||!dep.earliest_removal)errors.push(`${api}: incomplete deprecation metadata`);
    if(api==='@ruleoak/core.stableStringify'){
      if(!/@deprecated[^\n]*canonicalStringify/.test(dts))errors.push(`${api}: TypeScript @deprecated annotation missing`);
      if(!recorder.includes(dep.warning_code)||!recorder.includes('process.emitWarning'))errors.push(`${api}: runtime warning path missing`);
      if(!decls['@ruleoak/core'].has('canonicalStringify'))errors.push(`${api}: replacement export missing`);
    }
  }

  // Runtime verification is optional for source-only mutation tests and enabled by default for real QA.
  if(options.runtime!==false){
    try{
      const protocol=await import(pathToFileURL(resolve(root,'packages/protocol/src/index.js')).href+`?stability=${Date.now()}`);
      for(const name of snapshot.stable_exports?.['@ruleoak/protocol']||[])if(!(name in protocol))errors.push(`@ruleoak/protocol: stable runtime export missing: ${name}`);
    }catch(error){errors.push(`protocol runtime stability import failed: ${error.message}`);}
  }
  return {errors,stableExportCount,stableContractCount};
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const rootArg=process.argv.indexOf('--root');const snapshotArg=process.argv.indexOf('--snapshot');
  const result=await validatePublicApiStability({root:rootArg>=0?process.argv[rootArg+1]:undefined,snapshot:snapshotArg>=0?process.argv[snapshotArg+1]:undefined});
  if(result.errors.length){console.error(`public API stability QA FAILED (${result.errors.length})`);for(const e of result.errors.sort(cmp))console.error(`- ${e}`);process.exit(1);}console.log(`public API stability QA PASS: ${result.stableExportCount} stable exports, ${result.stableContractCount} stable protocol contracts`);
}
