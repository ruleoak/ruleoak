/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root=process.cwd();
const ignored=new Set(['node_modules','release-candidate','.ruleoak-demo-output','.git']);
const forbiddenPaths=[
  'docs/internal',
  'docs/project/GITHUB_OWNER_PUBLICATION_GUIDE.md',
  'docs/project/SEARCH_DISCOVERY_LAUNCH.md',
  'docs/project/NEW_REPOSITORY_PUBLICATION.md',
  'docs/public-launch.md',
  'site',
  'private',
  'commercial/entitlements',
  'customer-data'
];
for(const p of forbiddenPaths) assert.equal(existsSync(join(root,p)),false,`private/owner-only path must not ship publicly: ${p}`);
const forbiddenNames=/(?:owner[-_ ]publication|search[-_ ]discovery[-_ ]launch|market[-_ ]plan|commercial[-_ ]launch[-_ ]guide|private[-_ ]service[-_ ]source|private[-_ ]source|issuer[-_ ]private[-_ ]key)/i;
const hardSecrets=[
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/
];
const privateArtifact=/(?:ruleoak-pro-v\d|capability-watch-v\d[^\n]{0,80}private-service|ruleoak-operations-v\d)/i;
const textExt=/\.(?:md|txt|json|ya?ml|js|mjs|cjs|ts|d\.ts|html|css|xml|toml|ini|env|properties)$/i;
const files=[];
function walk(dir){for(const name of readdirSync(dir)){if(ignored.has(name))continue;const abs=join(dir,name),rel=relative(root,abs).replaceAll('\\','/');const st=statSync(abs);if(st.isDirectory()){assert.doesNotMatch(rel,forbiddenNames,`private/owner-only directory name in public source: ${rel}`);walk(abs);continue}files.push({abs,rel});assert.doesNotMatch(rel,forbiddenNames,`private/owner-only filename in public source: ${rel}`)}}
walk(root);
for(const {abs,rel} of files){if(!textExt.test(rel))continue;const text=readFileSync(abs,'utf8');for(const pattern of hardSecrets)assert.doesNotMatch(text,pattern,`secret-shaped material in public source: ${rel}`);if(!rel.startsWith('scripts/check_public_private_boundary.mjs'))assert.doesNotMatch(text,privateArtifact,`private artifact identity leaked in public source: ${rel}`)}
console.log(`public/private boundary check passed (${files.length} files scanned)`);
