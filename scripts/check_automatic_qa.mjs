/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { validateReliabilityReleaseContracts } from './reliability_release_qa.mjs';
import { validatePublicConformanceKit } from './public_conformance_qa.mjs';
import { validatePublicApiStability } from './public_api_stability_qa.mjs';

const root = process.cwd();
const excludedParts = new Set(['node_modules', '.git', '.ruleoak-demo-output', 'release-candidate']);
const errors = [];
const details = { tests: 0, javascript: 0, json: 0, qaAreas: 0, workspaces: 0, reliabilityClasses: 0, reliabilityDimensions: 0, reliabilityReleases: 0, conformanceContracts: 0, conformanceCases: 0, stableExports: 0, stableContracts: 0 };
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
function walk(dir, accept) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (excludedParts.has(entry.name)) continue;
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, accept));
    else if (accept(p)) out.push(p);
  }
  return out;
}
function requireFile(path, context) {
  if (!existsSync(resolve(root, path))) errors.push(`${context}: missing ${path}`);
}

function localModuleReachability(packageDir, entryRelatives) {
  const sourceRoots=[resolve(packageDir,'src')];
  if (existsSync(resolve(packageDir,'bin'))) sourceRoots.push(resolve(packageDir,'bin'));
  const all=new Set(sourceRoots.flatMap((dir)=>walk(dir,(p)=>extname(p)==='.js')));
  const seen=new Set();
  const stack=entryRelatives.map((entry)=>resolve(packageDir,entry));
  const importPattern=/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  const exportPattern=/export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;
  while(stack.length){
    const file=stack.pop();
    if(seen.has(file)||!existsSync(file))continue;
    seen.add(file);
    const text=readFileSync(file,'utf8');
    for(const pattern of [importPattern,exportPattern]){
      pattern.lastIndex=0;
      for(let m;(m=pattern.exec(text));){
        const spec=m[1];
        if(!spec.startsWith('.'))continue;
        let target=resolve(file.substring(0,file.lastIndexOf('/')),spec);
        if(!extname(target))target+= '.js';
        if(existsSync(target))stack.push(target);
      }
    }
  }
  return {all,seen};
}

let rootPkg;
try { rootPkg = readJson(resolve(root, 'package.json')); }
catch (error) { errors.push(`package.json: ${error.message}`); rootPkg = {}; }
const version = rootPkg.version;
const workspaces = rootPkg.workspaces || [];
details.workspaces = workspaces.length;
if (!version) errors.push('root package version is missing');
if (!workspaces.length) errors.push('root workspaces are missing');
if (!String(rootPkg.scripts?.test || '').includes('run_all_package_tests.mjs')) errors.push('root npm test must use automatic workspace test discovery');
if (!String(rootPkg.scripts?.['qa:auto'] || '').includes('check_automatic_qa.mjs')) errors.push('qa:auto script must run check_automatic_qa.mjs');

for (const workspace of workspaces) {
  const packageDir = resolve(root, workspace);
  const packageJsonPath = resolve(packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) { errors.push(`workspace ${workspace}: package.json missing`); continue; }
  const pkg = readJson(packageJsonPath);
  if (pkg.version !== version) errors.push(`workspace ${pkg.name}: version ${pkg.version} != root ${version}`);
  if (!String(pkg.scripts?.test || '').includes('run_package_tests.mjs')) errors.push(`workspace ${pkg.name}: npm test is not automatic discovery`);
  const testsDir = resolve(packageDir, 'tests');
  const tests = existsSync(testsDir) ? walk(testsDir, (path) => path.endsWith('.test.js')).sort() : [];
  if (!tests.length) errors.push(`workspace ${pkg.name}: no discovered tests`);
  details.tests += tests.length;
  const listed=spawnSync(process.execPath,[resolve(root,'scripts/run_package_tests.mjs'),packageDir,'--list-json'],{cwd:root,encoding:'utf8'});
  if(listed.status!==0)errors.push(`workspace ${pkg.name}: automatic test runner inventory failed: ${(listed.stderr||listed.stdout||'').trim()}`);
  else{
    try{
      const actual=JSON.parse((listed.stdout||'[]').trim());
      const expected=tests.map(test=>relative(packageDir,test).split('\\').join('/'));
      if(JSON.stringify(actual)!==JSON.stringify(expected))errors.push(`workspace ${pkg.name}: automatic runner inventory differs from structural QA inventory`);
    }catch(error){errors.push(`workspace ${pkg.name}: automatic runner inventory is not valid JSON: ${error.message}`);}
  }
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [dep, range] of Object.entries(pkg[section] || {})) {
      if (dep.startsWith('@ruleoak/') && range !== `^${version}`) errors.push(`workspace ${pkg.name}: ${dep} range ${range} != ^${version}`);
    }
  }
}

for (const p of walk(root, (p) => extname(p) === '.json')) {
  try { readJson(p); details.json += 1; }
  catch (error) { errors.push(`invalid JSON ${relative(root, p)}: ${error.message}`); }
}

const jsRoots = ['packages', 'scripts', 'tests', 'examples', 'extensions'].map((p) => resolve(root, p)).filter(existsSync);
const jsFiles = jsRoots.flatMap((dir) => walk(dir, (p) => ['.js', '.mjs', '.cjs'].includes(extname(p)))).sort();
async function syntaxCheckFile(path){
  return await new Promise((resolveCheck)=>{
    const child=spawn(process.execPath,['--check',path],{cwd:root,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
    child.on('error',error=>resolveCheck({path,status:1,output:error.message}));
    child.on('close',code=>resolveCheck({path,status:code??1,output:(stderr||stdout).trim()}));
  });
}
const syntaxResults=new Array(jsFiles.length);let syntaxCursor=0;
async function syntaxWorker(){while(true){const index=syntaxCursor++;if(index>=jsFiles.length)return;syntaxResults[index]=await syntaxCheckFile(jsFiles[index]);}}
await Promise.all(Array.from({length:Math.min(8,jsFiles.length)},()=>syntaxWorker()));
details.javascript=jsFiles.length;
for(const result of syntaxResults)if(result.status!==0)errors.push(`JavaScript syntax ${relative(root,result.path)}: ${result.output}`);

let matrix;
try { matrix = readJson(resolve(root, 'qa/release-critical-qa-matrix.json')); }
catch (error) { errors.push(`QA matrix: ${error.message}`); matrix = { areas: [] }; }
const areaIds = new Set();
for (const area of matrix.areas || []) {
  details.qaAreas += 1;
  if (!area.id || areaIds.has(area.id)) errors.push(`QA matrix: invalid/duplicate area id ${area.id || '<missing>'}`);
  areaIds.add(area.id);
  const tests = area.tests || [];
  if (!tests.length) errors.push(`QA matrix ${area.id}: no test/gate anchors`);
  for (const p of tests) requireFile(p, `QA matrix ${area.id}`);
  for (const p of area.schemas || []) requireFile(p, `QA matrix ${area.id}`);
  for (const p of area.docs || []) requireFile(p, `QA matrix ${area.id}`);
}
for (const [path, symbols] of Object.entries(matrix.required_public_symbols || {})) {
  requireFile(path, 'QA public symbol');
  if (!existsSync(resolve(root, path))) continue;
  const text = readFileSync(resolve(root, path), 'utf8');
  for (const symbol of symbols) if (!text.includes(symbol)) errors.push(`QA public symbol: ${symbol} missing from ${path}`);
}


const allowedUnreachable=new Set((matrix.allowed_unreachable_modules||[]).map((p)=>resolve(root,p)));
for(const [workspace,entries] of [['packages/protocol',['src/index.js','src/intent.js','src/intent-evidence.js','src/semantic-diff.js','src/intent-change.js','src/context-package.js','src/engineering-memory.js','src/model-execution.js','src/intent-compile.js','src/verify-product.js','src/oakspec.js','src/autonomous-development.js','src/development-learning.js','src/multi-frontend-development.js','src/family.js']],['packages/core',['src/index.js','src/family.js','src/family-receipts.js']],['packages/cli',['src/cli.js','bin/ruleoak.js']]]){
  const packageDir=resolve(root,workspace);
  const {all,seen}=localModuleReachability(packageDir,entries);
  for(const file of all){
    if(!seen.has(file)&&!allowedUnreachable.has(file))errors.push(`unreachable shipped module: ${relative(root,file)}`);
  }
}
for(const file of allowedUnreachable)if(!existsSync(file))errors.push(`QA allowed_unreachable_modules references missing file: ${relative(root,file)}`);

// Reliability coverage and schema/runtime parity. Every formal CrashLab failure class must be executable and anchored by tests.
let reliabilityMatrix;
try { reliabilityMatrix = readJson(resolve(root,'qa/reliability-coverage-matrix.json')); }
catch (error) { errors.push(`Reliability coverage matrix: ${error.message}`); reliabilityMatrix = { families: [] }; }
let crashProtocol={};
try { crashProtocol = await import(new URL('../packages/protocol/src/index.js', import.meta.url)); }
catch (error) { errors.push(`CrashLab protocol import: ${error.message}`); }
const runtimeClasses=[...(crashProtocol.CRASHLAB_FAILURE_CLASSES||[])];
const runtimePhases=[...(crashProtocol.CRASHLAB_FAILURE_PHASES||[])];
const runtimeInvariants=[...(crashProtocol.CRASHLAB_INVARIANTS||[])];
const familyMap=new Map();
for(const family of reliabilityMatrix.families||[]){
  if(!family?.failure_class||familyMap.has(family.failure_class))errors.push(`Reliability coverage: invalid/duplicate failure class ${family?.failure_class||'<missing>'}`);
  else familyMap.set(family.failure_class,family);
  if(family?.executable!==true)errors.push(`Reliability coverage ${family?.failure_class||'<missing>'}: executable must be true`);
  if(!Array.isArray(family?.tests)||family.tests.length===0)errors.push(`Reliability coverage ${family?.failure_class||'<missing>'}: no executable regression test`);
  for(const test of family?.tests||[]){requireFile(test,`Reliability coverage ${family.failure_class}`);if(existsSync(resolve(root,test))){const text=readFileSync(resolve(root,test),'utf8');if(!text.includes(family.failure_class))errors.push(`Reliability coverage ${family.failure_class}: referenced test does not contain the failure-class anchor`);}}
}
details.reliabilityClasses=runtimeClasses.length;
for(const cls of runtimeClasses)if(!familyMap.has(cls))errors.push(`Reliability coverage missing formal failure class: ${cls}`);
for(const cls of familyMap.keys())if(!runtimeClasses.includes(cls))errors.push(`Reliability coverage has unknown failure class: ${cls}`);
const crashCoreText=readFileSync(resolve(root,'packages/core/src/crashlab/index.js'),'utf8');
const supportedMatch=crashCoreText.match(/CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES\s*=\s*\[([\s\S]*?)\];/);
const supportedClasses=supportedMatch?[...supportedMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(m=>m[1]):[];
for(const cls of runtimeClasses)if(!supportedClasses.includes(cls))errors.push(`CrashLab executable coverage mismatch: ${cls} is formal but not in CRASHLAB_SYNTHETIC_SUPPORTED_FAILURE_CLASSES`);
try{
  const crashSchema=readJson(resolve(root,'packages/protocol/schemas/crashlab-scenario.schema.json'));
  const v21=(crashSchema.oneOf||[]).find(x=>x?.properties?.scenario_version?.const==='2.1');
  if(!v21)errors.push('CrashLab schema: Scenario v2.1 definition missing');
  else{
    const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
    const schemaClasses=v21?.properties?.fault?.properties?.class?.enum||[];
    const schemaPhases=v21?.properties?.fault?.properties?.phase?.enum||[];
    const schemaInvariants=v21?.properties?.expect?.properties?.invariants?.items?.enum||[];
    const schemaRetries=v21?.properties?.retry?.properties?.strategy?.enum||[];
    const schemaIdempotency=v21?.properties?.target?.properties?.idempotency?.enum||[];
    const schemaAuthority=v21?.properties?.expect?.properties?.authority_behavior?.enum||[];
    const schemaVersions=(crashSchema.oneOf||[]).flatMap(x=>x?.properties?.scenario_version?.enum||[x?.properties?.scenario_version?.const].filter(Boolean));
    if(!same(schemaClasses,runtimeClasses))errors.push('CrashLab schema/runtime failure-class enum mismatch');
    if(!same(schemaPhases,runtimePhases))errors.push('CrashLab schema/runtime failure-phase enum mismatch');
    if(!same(schemaInvariants,runtimeInvariants))errors.push('CrashLab schema/runtime invariant enum mismatch');
    if(!same(schemaRetries,crashProtocol.CRASHLAB_RETRY_STRATEGIES||[]))errors.push('CrashLab schema/runtime retry-strategy enum mismatch');
    if(!same(schemaIdempotency,crashProtocol.CRASHLAB_IDEMPOTENCY_MODES||[]))errors.push('CrashLab schema/runtime idempotency enum mismatch');
    if(!same(schemaAuthority,crashProtocol.CRASHLAB_AUTHORITY_EXPECTATIONS||[]))errors.push('CrashLab schema/runtime authority-expectation enum mismatch');
    if(!same(schemaVersions,crashProtocol.CRASHLAB_SCENARIO_VERSIONS||[]))errors.push('CrashLab schema/runtime scenario-version enum mismatch');
    const schemaPhaseMap=new Map();
    for(const rule of v21.allOf||[]){const cls=rule?.if?.properties?.fault?.properties?.class?.const;const phases=rule?.then?.properties?.fault?.properties?.phase?.enum;if(cls&&Array.isArray(phases))schemaPhaseMap.set(cls,phases);}
    for(const cls of runtimeClasses){const expected=crashProtocol.CRASHLAB_FAILURE_CLASS_PHASES?.[cls]||runtimePhases;const actual=schemaPhaseMap.get(cls)||schemaPhases;if(!same(actual,expected))errors.push(`CrashLab schema/runtime phase compatibility mismatch for ${cls}`);}
  }
}catch(error){errors.push(`CrashLab schema parity: ${error.message}`);}

// Reliability Scorecard & CI contract parity. The report must stay decomposable and versioned.
try{
  const scorecardSchema=readJson(resolve(root,'packages/protocol/schemas/reliability-scorecard.schema.json'));
  const runtimeDimensions=[...(crashProtocol.RELIABILITY_SCORECARD_DIMENSIONS||[])];
  const runtimeVersions=[...(crashProtocol.RELIABILITY_SCORECARD_VERSIONS||[])];
  details.reliabilityDimensions=runtimeDimensions.length;
  const requiredDimensions=scorecardSchema?.properties?.dimensions?.required||[];
  const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
  if(runtimeVersions.length!==1||scorecardSchema?.properties?.scorecard_version?.const!==runtimeVersions[0])errors.push('Reliability scorecard schema/runtime version mismatch');
  if(!same(requiredDimensions,runtimeDimensions))errors.push('Reliability scorecard schema/runtime dimension mismatch');
  if(scorecardSchema?.additionalProperties!==false)errors.push('Reliability scorecard schema must reject opaque undeclared top-level fields');
  if(Object.hasOwn(scorecardSchema?.properties||{},'score'))errors.push('Reliability scorecard schema must not define an opaque top-level score');
  const coreScorecardText=readFileSync(resolve(root,'packages/core/src/crashlab/scorecard.js'),'utf8');
  if(!coreScorecardText.includes('PROTOCOL_RELIABILITY_SCORECARD_DIMENSIONS'))errors.push('Core scorecard must consume canonical protocol reliability dimensions');
  for(const formatSymbol of ['serializeReliabilityScorecardJson','serializeReliabilityScorecardJUnit','serializeReliabilityScorecardSarif','renderReliabilityScorecardSummary'])if(!coreScorecardText.includes(formatSymbol))errors.push(`Core scorecard output missing ${formatSymbol}`);
}catch(error){errors.push(`Reliability scorecard parity: ${error.message}`);}


try{
  const releaseQa=validateReliabilityReleaseContracts({root,protocol:crashProtocol,reliabilityMatrix});
  details.reliabilityReleases=releaseQa.releaseCount;
  errors.push(...releaseQa.errors);
}catch(error){errors.push(`Reliability release QA: ${error.message}`);}

try{
  const conformanceQa=validatePublicConformanceKit({root});
  details.conformanceContracts=conformanceQa.contractCount;
  details.conformanceCases=conformanceQa.caseCount;
  errors.push(...conformanceQa.errors);
}catch(error){errors.push(`Public conformance QA: ${error.message}`);}

try{
  const stabilityQa=await validatePublicApiStability({root});
  details.stableExports=stabilityQa.stableExportCount;
  details.stableContracts=stabilityQa.stableContractCount;
  errors.push(...stabilityQa.errors);
}catch(error){errors.push(`Public API stability QA: ${error.message}`);}

const changelog=readFileSync(resolve(root,'CHANGELOG.md'),'utf8');
const releases=[...changelog.matchAll(/^##\s+(\d+)\.(\d+)\.(\d+)(?:\s|$)/gm)].map((m)=>({text:`${m[1]}.${m[2]}.${m[3]}`,parts:m.slice(1,4).map(Number)}));
for(let i=1;i<releases.length;i++){
  const a=releases[i-1].parts,b=releases[i].parts;
  const descending=a[0]>b[0]||(a[0]===b[0]&&(a[1]>b[1]||(a[1]===b[1]&&a[2]>b[2])));
  if(!descending)errors.push(`CHANGELOG release order is not descending: ${releases[i-1].text} before ${releases[i].text}`);
}

// Ensure every package test is in the automatic inventory. Manual package test lists are forbidden.
for (const workspace of workspaces) {
  const pkg = readJson(resolve(root, workspace, 'package.json'));
  if (/tests\/[\w.-]+\.test\.js/.test(String(pkg.scripts?.test || ''))) errors.push(`workspace ${pkg.name}: manual test filename found in npm test`);
}

if (errors.length) {
  console.error(`automatic QA FAILED (${errors.length} issue${errors.length === 1 ? '' : 's'})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`automatic QA PASS: ${details.workspaces} workspaces, ${details.tests} recursively discovered tests, ${details.javascript} JavaScript syntax checks, ${details.json} JSON files, ${details.qaAreas} release-critical QA areas, ${details.reliabilityClasses} reliability classes, ${details.reliabilityDimensions} reliability dimensions, ${details.reliabilityReleases} reliability release contracts, ${details.conformanceContracts} conformance contracts, ${details.conformanceCases} conformance cases, ${details.stableExports} stable exports, ${details.stableContracts} stable protocol contracts`);
