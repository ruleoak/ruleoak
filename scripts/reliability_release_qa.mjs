/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readJson=(path)=>JSON.parse(readFileSync(path,'utf8'));
const compareText=(a,b)=>String(a)<String(b)?-1:String(a)>String(b)?1:0;
const sameSet=(a,b)=>JSON.stringify([...a].sort(compareText))===JSON.stringify([...b].sort(compareText));

export function validateReliabilityReleaseContracts({root,protocol,contracts=null,reliabilityMatrix=null}){
  const errors=[];
  const contract=contracts||readJson(resolve(root,'qa/reliability-release-contracts.json'));
  const matrix=reliabilityMatrix||readJson(resolve(root,'qa/reliability-coverage-matrix.json'));
  if(contract?.contract_version!=='1.0')errors.push('Reliability QA contract_version must be 1.0');
  const contractsByName=contract?.contracts||{};
  for(const name of ['concurrency_staleness','scorecard_ci'])if(!contractsByName[name])errors.push(`Reliability QA missing ${name}`);

  const concurrency=contractsByName.concurrency_staleness||{};
  const concurrencyClasses=(matrix.families||[]).filter(x=>x?.coverage_family==='concurrency_staleness').map(x=>x.failure_class);
  if(concurrency.scenario_version!=='2.1'||!(protocol.CRASHLAB_SCENARIO_VERSIONS||[]).includes(concurrency.scenario_version))errors.push('Concurrency/staleness QA must bind Scenario v2.1');
  if(!sameSet(concurrency.introduced_failure_classes||[],concurrencyClasses))errors.push('Concurrency/staleness failure-class set does not match reliability coverage matrix');
  for(const cls of concurrency.introduced_failure_classes||[])if(!(protocol.CRASHLAB_FAILURE_CLASSES||[]).includes(cls))errors.push(`Concurrency/staleness QA unknown failure class: ${cls}`);
  for(const invariant of concurrency.required_invariants||[])if(!(protocol.CRASHLAB_INVARIANTS||[]).includes(invariant))errors.push(`Concurrency/staleness QA missing runtime invariant: ${invariant}`);
  for(const expectation of concurrency.required_authority_expectations||[])if(!(protocol.CRASHLAB_AUTHORITY_EXPECTATIONS||[]).includes(expectation))errors.push(`Concurrency/staleness QA missing authority expectation: ${expectation}`);

  const scorecard=contractsByName.scorecard_ci||{};
  const scorecardVersions=[...(protocol.RELIABILITY_SCORECARD_VERSIONS||[])];
  const dimensions=[...(protocol.RELIABILITY_SCORECARD_DIMENSIONS||[])];
  if(scorecardVersions.length!==1||scorecard.scorecard_version!==scorecardVersions[0])errors.push('Reliability scorecard QA version mismatch');
  if(!sameSet(scorecard.dimensions||[],dimensions))errors.push('Reliability scorecard QA dimension set mismatch');
  const mapping=protocol.RELIABILITY_SCORECARD_INVARIANT_DIMENSIONS||{};
  if(!sameSet(Object.keys(mapping),protocol.CRASHLAB_INVARIANTS||[]))errors.push('Reliability scorecard invariant-to-dimension mapping must cover every formal CrashLab invariant exactly once');
  for(const [invariant,dimension] of Object.entries(mapping))if(!dimensions.includes(dimension))errors.push(`Reliability scorecard invariant mapping ${invariant} uses unknown dimension ${dimension}`);
  if(scorecard.ci_exit_codes?.PASS!==0||scorecard.ci_exit_codes?.FAIL!==2)errors.push('Reliability scorecard CI exit-code contract must remain PASS=0 FAIL=2');
  if(!scorecard.schema||!existsSync(resolve(root,scorecard.schema)))errors.push('Reliability scorecard schema missing');
  else{
    const schema=readJson(resolve(root,scorecard.schema));
    if(Object.hasOwn(schema?.properties||{},'score'))errors.push('Reliability scorecard schema must not expose opaque score');
    if(schema?.additionalProperties!==false)errors.push('Reliability scorecard schema must remain closed at top level');
  }

  for(const [contractId,item] of Object.entries(contractsByName)){
    for(const test of item.tests||[])if(!existsSync(resolve(root,test)))errors.push(`${contractId} QA missing test anchor: ${test}`);
    for(const [path,anchors] of Object.entries(item.source_anchors||{})){
      const full=resolve(root,path);
      if(!existsSync(full)){errors.push(`${contractId} QA missing source anchor file: ${path}`);continue;}
      const text=readFileSync(full,'utf8');
      for(const anchor of anchors||[])if(!text.includes(anchor))errors.push(`${contractId} QA source anchor missing from ${path}: ${anchor}`);
    }
  }
  const scorecardText=existsSync(resolve(root,'packages/core/src/crashlab/scorecard.js'))?readFileSync(resolve(root,'packages/core/src/crashlab/scorecard.js'),'utf8'):'';
  for(const symbol of scorecard.required_outputs||[])if(!scorecardText.includes(symbol))errors.push(`Reliability scorecard output symbol missing: ${symbol}`);
  return {errors,releaseCount:Object.keys(contractsByName).length};
}
