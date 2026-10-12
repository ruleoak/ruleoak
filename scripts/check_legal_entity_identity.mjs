/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';

const ROOT=process.cwd();
const legalName='RuleOak Pte. Ltd.';
const uen='202639787M';
const obsoleteName=['RuleOak','Pte','Ltd'].join(' ');
const skip=new Set(['.git','node_modules','.ruleoak','.ruleoak-demo-output','release-candidate']);
const textExt=/\.(?:md|txt|json|mjs|js|cjs|ts|d\.ts|yml|yaml|toml|cff|xml|html|css|sh|py)$/i;
const special=new Set(['LICENSE','NOTICE','Dockerfile','action.yml']);
const files=[];
function walk(dir){for(const name of readdirSync(dir)){if(skip.has(name))continue;const p=join(dir,name),st=statSync(p);if(st.isDirectory())walk(p);else if(st.isFile())files.push(p)}}
walk(ROOT);
for(const p of files){
  const rel=relative(ROOT,p);
  if(rel==='SOURCE_MANIFEST.sha256') continue;
  if(!textExt.test(rel) && !special.has(rel.split('/').at(-1))) continue;
  let text; try{text=readFileSync(p,'utf8')}catch{continue}
  assert.equal(text.includes(obsoleteName),false,`${rel}: obsolete unpunctuated legal name remains`);
}
for(const rel of ['README.md','AUTHORS.md','NOTICE.md','GOVERNANCE.md']){
  const text=readFileSync(join(ROOT,rel),'utf8');
  assert.ok(text.includes(legalName),`${rel}: exact legal name missing`);
  assert.ok(text.includes(uen),`${rel}: UEN missing`);
}
for(const rel of ['CITATION.cff','package.json','packages/protocol/package.json','packages/core/package.json','packages/cli/package.json']){
  const text=readFileSync(join(ROOT,rel),'utf8');
  assert.ok(text.includes(legalName),`${rel}: exact legal name missing`);
}
console.log(`LEGAL_ENTITY_IDENTITY_PASS publisher="${legalName}" uen=${uen} files=${files.length}`);
