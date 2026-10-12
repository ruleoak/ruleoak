/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { readBoundedFileSync } from './io/durable-file.js';
import { resolve, join } from 'node:path';
import { buildPublicCapabilityIndex, FileCapabilityHistoryStore } from '@ruleoak/core';
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function page(title,description,canonical,body){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website"></head><body><main>${body}</main></body></html>`;}
function labels(values=[]){return values.length?values.map(v=>`<span class="evidence-badge">${esc(v)}</span>`).join(' · '):'<span class="evidence-badge">Uninspected</span>';}
function statusText(v){return({inspected:'Inspected',declared_only:'Declared only',registry_only:'Registry metadata only',uninspected:'Uninspected'})[v]||'Uninspected';}
function unique(values){return[...new Set(values.filter(Boolean))];}
export function loadPublicIndexEntries(dir){
  const root=resolve(dir);const names=readdirSync(root).filter(n=>n.endsWith('.json')).sort();if(names.length>10_000)throw new Error('public Inspector input exceeds max JSON files (10000)');return names.map(name=>{const parsed=JSON.parse(readBoundedFileSync(join(root,name),{maxBytes:8*1024*1024,label:'public Inspector entry'}));return parsed.manifest?parsed:{manifest:parsed,observed_at:null};});
}
export function loadPublicCapabilityHistory(file){return new FileCapabilityHistoryStore(resolve(file)).load();}
export function writePublicCapabilityIndex(entries,outDir,options={}){
  if(options.confirmPublic!==true)throw new Error('public Inspector index generation requires explicit --confirm-public');
  const out=resolve(outDir),historyObservations=options.historyObservations||[];mkdirSync(out,{recursive:true});
  const index=buildPublicCapabilityIndex(entries,{generatedAt:options.generatedAt||null,baseUrl:options.baseUrl||'https://ruleoak.com/inspector-index',historyObservations});
  const b=index.base_url;writeFileSync(join(out,'index.json'),JSON.stringify(index,null,2)+'\n');
  const cards=[],sitemap=new Set([`${b}/`]);
  for(const item of index.integrations){
    const dir=join(out,'integrations',item.slug),historyDir=join(dir,'history'),versionRoot=join(dir,'versions');mkdirSync(historyDir,{recursive:true});mkdirSync(versionRoot,{recursive:true});
    writeFileSync(join(dir,'index.json'),JSON.stringify(item,null,2)+'\n');
    const latest=item.latest||{},summary=latest.summary||{},canonical=`${b}/${item.canonical_path}`,historyCanonical=`${canonical}history/`;sitemap.add(canonical);sitemap.add(historyCanonical);
    const evidence=unique((latest.tools||[]).flatMap(t=>t.evidence_labels||[]));
    const desc=`RuleOak capability profile for ${item.name}: ${summary.total||0} tools, ${summary.state_changing||0} state-changing, ${summary.high_consequence||0} high-consequence. Evidence status: ${statusText(item.inspection_status)}.`;
    const toolRows=(latest.tools||[]).map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.state)}</td><td>${esc(t.consequence)}</td><td>${labels(t.evidence_labels||[])}</td></tr>`).join('');
    const driftRows=[...item.history_events].reverse().slice(0,50).map(e=>`<li>${esc(e.observed_at)} · ${esc(e.action_name)} · ${esc(e.lifecycle_state)} · ${esc(e.drift_categories.join(', ')||'observation')}</li>`).join('');
    const drift=item.history_events.length?`<h2>Capability history</h2><ul>${driftRows}</ul><p><a href="history/">Full history</a></p>`:item.drift_events.length?`<h2>Capability changes</h2><ul>${item.drift_events.slice().reverse().map(e=>`<li>${esc(e.observed_at||'undated')}: +${e.added.length} / -${e.removed.length} / ${e.modified.length} modified; ${e.authority_surface_broadened.length} broadened</li>`).join('')}</ul>`:'<p>No historical capability change is recorded in this index.</p>';
    const watch=`<h2>Watch this integration</h2><p>Use the public <a href="watch.json">watch contract</a> to identify this integration and its current public baseline. The contract does not grant runtime authority.</p>`;
    writeFileSync(join(dir,'watch.json'),JSON.stringify({...item.watch,canonical_url:canonical,watch_contract_url:`${canonical}watch.json`,generated_at:index.generated_at},null,2)+'\n');
    writeFileSync(join(dir,'index.html'),page(`${item.name} capability profile | RuleOak`,desc,canonical,`<h1>${esc(item.name)}</h1><p>${esc(desc)}</p><p>Status: <strong>${esc(statusText(item.inspection_status))}</strong> · Evidence: ${labels(evidence)}</p><p>Fingerprint: <code>${esc(latest.fingerprint||'unknown')}</code></p><table><thead><tr><th>Tool</th><th>State</th><th>Consequence</th><th>Evidence</th></tr></thead><tbody>${toolRows}</tbody></table>${drift}${watch}<p>Generated from normalized public Inspector metadata. Registry-only entries are not represented as inspected. Raw schemas, descriptions, credentials, source code and private endpoints are not published by this pipeline.</p>`));
    const historyBody=item.history.length?`<ol>${item.history.map(o=>`<li><time>${esc(o.observed_at)}</time> · <strong>${esc(o.action_name)}</strong> · ${esc(o.lifecycle_state)} · ${esc(o.snapshot.state)}/${esc(o.snapshot.consequence)} · ${labels(o.snapshot.evidence_labels||[])}${o.drift_categories.length?` · ${esc(o.drift_categories.join(', '))}`:''}</li>`).join('')}</ol>`:'<p>No CapabilityObservation history was supplied for this public profile.</p>';
    writeFileSync(join(historyDir,'index.json'),JSON.stringify({integration_id:item.integration_id,integration_name:item.name,history:item.history},null,2)+'\n');
    writeFileSync(join(historyDir,'index.html'),page(`${item.name} capability history | RuleOak`,`Historical public RuleOak capability observations for ${item.name}.`,historyCanonical,`<h1>${esc(item.name)} capability history</h1><p><a href="../">Current capability profile</a></p>${historyBody}<p>History contains normalized publication-safe observations only.</p>`));
    for(const version of item.versions){const vdir=join(versionRoot,version.key);mkdirSync(vdir,{recursive:true});const vurl=`${canonical}versions/${version.key}/`;sitemap.add(vurl);const vdesc=`RuleOak capability snapshot for ${item.name}${version.version?` version ${version.version}`:''}, observed ${version.observed_at||'at an unspecified time'}.`;
      const rows=(version.manifest.tools||[]).map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.state)}</td><td>${esc(t.consequence)}</td><td>${labels(t.evidence_labels||[])}</td></tr>`).join('');
      writeFileSync(join(vdir,'index.json'),JSON.stringify(version,null,2)+'\n');writeFileSync(join(vdir,'index.html'),page(`${item.name}${version.version?` ${version.version}`:''} capability snapshot | RuleOak`,vdesc,vurl,`<h1>${esc(item.name)} capability snapshot</h1><p>${esc(vdesc)}</p><p>Status: ${esc(statusText(version.inspection_status))} · Evidence: ${labels(version.evidence_labels)}</p><p>Fingerprint: <code>${esc(version.fingerprint)}</code></p><table><thead><tr><th>Tool</th><th>State</th><th>Consequence</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table><p><a href="../../">Current profile</a> · <a href="../../history/">History</a></p>`));}
    cards.push(`<li><a href="${item.canonical_path}">${esc(item.name)}</a> — ${summary.total||0} tools — ${esc(statusText(item.inspection_status))}</li>`);
  }
  writeFileSync(join(out,'index.html'),page('AI agent and MCP capability index | RuleOak','Public RuleOak Inspector capability profiles, evidence provenance, version history and authority-surface drift.',`${b}/`,`<h1>RuleOak capability index</h1><p>Public capability metadata for AI-agent tool integrations and MCP servers. Evidence labels distinguish Registry metadata, Declared, Inspected and Inferred information.</p><ul>${cards.join('')}</ul>`));
  const feedItems=[];
  for(const item of index.integrations){for(const e of item.history_events){if(e.lifecycle_state==='first_seen')continue;if(!e.drift_categories.length&&!['removed','reintroduced'].includes(e.lifecycle_state))continue;feedItems.push({id:e.event_id,url:`${b}/${item.canonical_path}history/`,title:`${item.name}: ${e.action_name} ${e.lifecycle_state}`,date_published:e.observed_at,content_text:`Lifecycle ${e.lifecycle_state}; drift ${e.drift_categories.join(', ')||'none'}; evidence ${e.evidence_labels.join(', ')||'Uninspected'}.`});}}
  if(!feedItems.length){for(const e of index.drift_events)feedItems.push({id:e.event_id,url:`${b}/integrations/${e.slug}/`,title:`${e.name} capability surface changed`,date_published:e.observed_at||undefined,content_text:`Added ${e.added.length}; removed ${e.removed.length}; modified ${e.modified.length}; authority surface broadened ${e.authority_surface_broadened.length}.`});}
  feedItems.sort((a,b)=>String(b.date_published||'').localeCompare(String(a.date_published||''))||a.id.localeCompare(b.id));
  const feed={version:'https://jsonfeed.org/version/1.1',title:'RuleOak capability drift',home_page_url:`${b}/`,feed_url:`${b}/feed.json`,items:feedItems};writeFileSync(join(out,'feed.json'),JSON.stringify(feed,null,2)+'\n');
  writeFileSync(join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...sitemap].sort().map(u=>`<url><loc>${esc(u)}</loc></url>`).join('')}</urlset>\n`);
  writeFileSync(join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${b}/sitemap.xml\n`);
  return{out,index};
}
