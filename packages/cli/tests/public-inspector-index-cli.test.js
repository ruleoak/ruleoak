/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,readdirSync} from 'node:fs';
import{tmpdir}from'node:os';import{join}from'node:path';
import{buildCapabilityManifest,observeCapabilityManifest}from'@ruleoak/core';
import{loadPublicIndexEntries,loadPublicCapabilityHistory,writePublicCapabilityIndex}from'../src/inspector-public.js';
const root=mkdtempSync(join(tmpdir(),'ruleoak-index-')),src=join(root,'snapshots'),out=join(root,'public'),historyFile=join(root,'history.jsonl');mkdirSync(src);
const a=buildCapabilityManifest({name:'Fixture MCP',version:'1.0.0',source:'https://example.test/mcp?secret=DO_NOT_PUBLISH',tools:[{name:'read.item',description:'SECRET DESCRIPTION',annotations:{readOnlyHint:true}}]},{identityKey:'fixture.mcp',observedAt:'2026-08-01T00:00:00Z'});
const b=buildCapabilityManifest({name:'Fixture MCP',version:'1.1.0',source:'https://example.test/mcp?secret=DO_NOT_PUBLISH',tools:[{name:'read.item',description:'SECRET DESCRIPTION',annotations:{readOnlyHint:true}},{name:'delete.item',description:'TOP SECRET',annotations:{readOnlyHint:false,destructiveHint:true}}]},{identityKey:'fixture.mcp',observedAt:'2026-08-02T00:00:00Z'});
writeFileSync(join(src,'01.json'),JSON.stringify({observed_at:'2026-08-01T00:00:00Z',manifest:a}));writeFileSync(join(src,'02.json'),JSON.stringify({observed_at:'2026-08-02T00:00:00Z',manifest:b}));
let history=[];const h1=observeCapabilityManifest(history,a,{observedAt:'2026-08-01T00:00:00Z'});history.push(...h1);const h2=observeCapabilityManifest(history,b,{observedAt:'2026-08-02T00:00:00Z'});history.push(...h2);writeFileSync(historyFile,history.map(v=>JSON.stringify(v)).join('\n')+'\n');
assert.throws(()=>writePublicCapabilityIndex(loadPublicIndexEntries(src),out,{baseUrl:'https://example.test/index'}),/confirm-public/);
const loadedHistory=loadPublicCapabilityHistory(historyFile);assert.equal(loadedHistory.length,3);
const result=writePublicCapabilityIndex(loadPublicIndexEntries(src),out,{baseUrl:'https://example.test/index',confirmPublic:true,generatedAt:'2026-08-03T00:00:00Z',historyObservations:loadedHistory});
assert.equal(result.index.drift_events.length,1);const item=result.index.integrations[0],idir=join(out,'integrations',item.slug);assert.ok(existsSync(join(idir,'index.html')));assert.ok(existsSync(join(idir,'history','index.html')));assert.ok(existsSync(join(idir,'watch.json')));assert.equal(readdirSync(join(idir,'versions')).length,2);
const bytes=[join(out,'index.json'),join(idir,'index.html'),join(idir,'history','index.html'),join(idir,'watch.json'),join(out,'feed.json'),join(out,'sitemap.xml')].map(p=>readFileSync(p,'utf8')).join('\n');
assert.ok(!bytes.includes('SECRET DESCRIPTION'));assert.ok(!bytes.includes('TOP SECRET'));assert.ok(!bytes.includes('DO_NOT_PUBLISH'));assert.ok(bytes.includes('delete.item'));assert.ok(bytes.includes('Declared'));assert.ok(!readFileSync(join(idir,'index.html'),'utf8').includes('Status: <strong>Inspected</strong>'));assert.ok(bytes.includes('Watch this integration'));
const watch=JSON.parse(readFileSync(join(idir,'watch.json'),'utf8'));assert.equal(watch.watch_contract_version,'1.0');assert.equal(watch.integration_id,b.identity.integration_id);assert.equal(watch.latest_fingerprint,b.fingerprint);assert.equal(watch.canonical_url,`https://example.test/index/integrations/${item.slug}/`);
const feed=JSON.parse(readFileSync(join(out,'feed.json'),'utf8'));assert.ok(feed.items.every(i=>!i.title.includes('first_seen')),'initial baseline must not appear as drift alert');
const sitemap=readFileSync(join(out,'sitemap.xml'),'utf8');const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);assert.equal(new Set(locs).size,locs.length,'sitemap URLs must be unique');assert.ok(locs.some(u=>u.endsWith('/history/')));assert.ok(locs.some(u=>u.includes('/versions/')));
console.log('public Inspector index CLI tests passed');
