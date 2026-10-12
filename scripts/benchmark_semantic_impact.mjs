/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildRepositoryUnderstanding } from '../packages/cli/src/brownfield-understanding.js';
import { analyzeSemanticImpact } from '../packages/cli/src/semantic-impact.js';
const benchmark=JSON.parse(readFileSync(new URL('../qa/semantic-impact-benchmark.json',import.meta.url),'utf8'));
const graph=buildRepositoryUnderstanding(process.cwd());
let tp=0,fp=0,fn=0,exact=0;const failures=[];
for(const c of benchmark.cases){
  const r=analyzeSemanticImpact(graph,c.request); const actual=new Set(r.affected_capability_ids), expected=new Set(c.expected_affected_capabilities);
  for(const x of actual) expected.has(x)?tp++:fp++;
  for(const x of expected) if(!actual.has(x)) fn++;
  const same=actual.size===expected.size&&[...actual].every(x=>expected.has(x)); if(same) exact++; else failures.push({id:c.id,request:c.request,expected:[...expected].sort(),actual:[...actual].sort(),direct:r.direct_capabilities.map(x=>[x.capability_id,x.score])});
}
const precision=tp/(tp+fp||1),recall=tp/(tp+fn||1),f1=2*precision*recall/(precision+recall||1),exact_rate=exact/benchmark.cases.length;
const report={benchmark_version:benchmark.benchmark_version,wave:'Semantic Impact',cases:benchmark.cases.length,labeling:benchmark.labeling,metrics:{true_positive:tp,false_positive:fp,false_negative:fn,precision,recall,f1,exact_match_rate:exact_rate,exact_match_cases:exact},failures};
if(process.argv.includes('--json')) console.log(JSON.stringify(report,null,2)); else console.log(`SEMANTIC_IMPACT_BENCHMARK cases=${report.cases} precision=${precision.toFixed(4)} recall=${recall.toFixed(4)} f1=${f1.toFixed(4)} exact=${exact}/${report.cases}`);
const outIndex=process.argv.indexOf('--out');if(outIndex>=0){const out=process.argv[outIndex+1];if(!out)throw new Error('--out requires a file');writeFileSync(out,`${JSON.stringify(report,null,2)}\n`);}
if(precision<0.95||recall<0.95||exact_rate<0.90){console.error(JSON.stringify(failures,null,2));process.exitCode=1;}
