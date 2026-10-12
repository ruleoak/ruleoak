/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

function compareText(a,b){const left=String(a),right=String(b);return left<right?-1:left>right?1:0;}
function discoverTests(dir){
  const out=[];
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const path=resolve(dir,entry.name);
    if(entry.isDirectory())out.push(...discoverTests(path));
    else if(entry.isFile()&&entry.name.endsWith('.test.js'))out.push(path);
  }
  return out.sort(compareText);
}

const packageRoot = resolve(process.cwd(), process.argv[2] || '.');
const testsDir = resolve(packageRoot, 'tests');
const listJson = process.argv.includes('--list-json');
if (!statSync(testsDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`automatic QA: missing tests directory: ${testsDir}`);
  process.exit(1);
}
const tests = discoverTests(testsDir);
if (tests.length === 0) {
  console.error(`automatic QA: no *.test.js files discovered in ${testsDir}`);
  process.exit(1);
}
const relativeTests=tests.map(test=>relative(packageRoot,test).split('\\').join('/'));
if(listJson){
  process.stdout.write(`${JSON.stringify(relativeTests)}\n`);
  process.exit(0);
}
console.log(`automatic QA: discovered ${tests.length} tests in ${relative(process.cwd(), packageRoot) || '.'}`);
for (const test of tests) {
  const result = spawnSync(process.execPath, [test], {
    cwd: packageRoot,
    stdio: 'inherit',
    env: { ...process.env, RULEOAK_AUTOMATIC_QA: '1' }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
