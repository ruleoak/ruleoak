/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const skip = new Set(['.git','node_modules','.ruleoak','.ruleoak-demo-output','release-candidate']);
const banned = [
  ['Sun','Shaobin'].join(' '),
  ['Stanley','Sun'].join(' '),
  ['The RuleOak','Authors'].join(' '),
  ['RuleOak','Contributors'].join(' '),
];
const required = 'RuleOak Pte. Ltd.';
const textExt = /\.(?:md|txt|json|mjs|js|cjs|ts|d\.ts|yml|yaml|toml|cff|xml|html|css|sh|py)$/i;
const special = new Set(['LICENSE','NOTICE','Dockerfile','action.yml']);
const files=[];
function walk(dir){
  for(const name of readdirSync(dir)){
    if(skip.has(name)) continue;
    const path=join(dir,name); const st=statSync(path);
    if(st.isDirectory()) walk(path); else if(st.isFile()) files.push(path);
  }
}
walk(root);
const findings=[];
for(const path of files){
  const rel=relative(root,path);
  if(rel==='SOURCE_MANIFEST.sha256') continue;
  if(!textExt.test(rel) && !special.has(rel.split('/').at(-1))) continue;
  let text; try{text=readFileSync(path,'utf8')}catch{continue}
  for(const token of banned) if(text.includes(token)) findings.push(`${rel}: banned identity ${token}`);
}
if(findings.length) throw new Error(`publication identity violations:\n${findings.join('\n')}`);
for(const rel of ['AUTHORS.md','GOVERNANCE.md','NOTICE.md','CITATION.cff','package.json','packages/protocol/package.json','packages/core/package.json','packages/cli/package.json']){
  const text=readFileSync(rel,'utf8'); if(!text.includes(required)) throw new Error(`${rel}: missing ${required}`);
}
console.log(`PUBLICATION_IDENTITY_PASS files=${files.length} publisher=${required}`);
