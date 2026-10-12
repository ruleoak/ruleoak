/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
const ROOT=process.cwd();
const skip=new Set(['node_modules','.git','release-candidate']);
const textExt=new Set(['.md','.json','.yml','.yaml','.cff','.toml','.js','.mjs','.ts','.txt']);
const files=[];
function walk(dir){for(const n of readdirSync(dir)){if(skip.has(n))continue;const p=join(dir,n),st=statSync(p);if(st.isDirectory())walk(p);else files.push(p)}}
walk(ROOT);
const docs=files.filter(p=>{const r=relative(ROOT,p);return (r.endsWith('.md')||r.endsWith('.cff')||r.endsWith('.toml')||r.endsWith('.yml')||r.endsWith('.yaml')||r==='NOTICE.md'||r==='LICENSE.md'||r==='README.md'||r==='ROADMAP.md'||r==='SUPPORT.md') && !r.startsWith('scripts/');});
const merged=docs.map(p=>`\n### ${relative(ROOT,p)}\n${readFileSync(p,'utf8')}`).join('\n');
assert.equal(existsSync(join(ROOT,'COMMERCIAL.md')),false,'COMMERCIAL.md must not ship in the open-source-only public release');
for(const pattern of [/RuleOak Pro(?:\s|$)/i,/Pro — early access/i,/Pro\/Enterprise/i,/Enterprise — pilots/i]) assert.doesNotMatch(merged,pattern,`commercial-tier text remains: ${pattern}`);
assert.match(readFileSync(join(ROOT,'README.md'),'utf8'),/single free\/open-source project/i);
assert.match(readFileSync(join(ROOT,'LICENSE.md'),'utf8'),/RuleOak v0\.50\.0 is the starting public release/);
assert.match(readFileSync(join(ROOT,'NOTICE.md'),'utf8'),/RuleOak Pte\. Ltd\./);
for(const bad of ['Sun '+'Shaobin','Stanley '+'Sun','RuleOak Contrib'+'utors','RuleOak Auth'+'ors']) assert.ok(!merged.toLowerCase().includes(bad.toLowerCase()),`banned publisher identity remains: ${bad}`);
for(const rel of ['MIGRATION.md','CHANGELOG.md','LICENSE.md']) assert.doesNotMatch(readFileSync(join(ROOT,rel),'utf8'),/v0\.(?:[0-4]|[0-4][0-9])\.\d+/i,`${rel} contains pre-v0.50 public history`);
console.log('OPEN_SOURCE_ONLY_PASS');
