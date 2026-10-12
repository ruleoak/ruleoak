/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { canonicalStringify } from '../decision/receipt.js';
function semanticToolFingerprint(manifest={}){
  const tools=(manifest.tools||[]).map(t=>({name:String(t?.name||''),schema_digest:t?.schema_digest||null,description_digest:t?.description_digest||null,annotations_digest:t?.annotations_digest||null})).sort((a,b)=>a.name.localeCompare(b.name));
  return `sha256:${createHash('sha256').update(canonicalStringify(tools)).digest('hex')}`;
}
export function buildMcpCapabilityPin(manifest,options={}){
  if(!manifest?.fingerprint)throw new Error('MCP capability pin requires a capability manifest fingerprint');
  const createdAt=new Date(options.createdAt||new Date()).toISOString();const ttlMs=Number.isFinite(options.ttlMs)?Math.max(1000,options.ttlMs):24*60*60*1000;
  return{pin_version:'1.0',fingerprint:manifest.fingerprint,semantic_definition_fingerprint:semanticToolFingerprint(manifest),identity:structuredClone(manifest.identity||{}),created_at:createdAt,expires_at:new Date(new Date(createdAt).getTime()+ttlMs).toISOString(),tools:(manifest.tools||[]).map(t=>({name:String(t.name),schema_digest:t.schema_digest||null})).sort((a,b)=>a.name.localeCompare(b.name))};
}
export function verifyMcpToolCallAgainstPin(payload,pin,options={}){
  const errors=[];if(pin?.pin_version!=='1.0')errors.push('unsupported or missing MCP capability pin version');
  const now=new Date(options.now||new Date()).getTime();if(!Number.isFinite(new Date(pin?.expires_at||0).getTime())||new Date(pin.expires_at).getTime()<=now)errors.push('MCP capability pin has expired');
  const name=String(payload?.params?.name||'');if(!name)errors.push('MCP tools/call is missing params.name');else if(!Array.isArray(pin?.tools)||!pin.tools.some(t=>t.name===name))errors.push(`MCP tool is outside pinned capability surface: ${name}`);
  if(options.currentManifest?.fingerprint&&options.currentManifest.fingerprint!==pin?.fingerprint)errors.push('MCP capability surface fingerprint changed; re-inspection and re-pinning required');
  if(options.currentManifest&&pin?.semantic_definition_fingerprint&&semanticToolFingerprint(options.currentManifest)!==pin.semantic_definition_fingerprint)errors.push('MCP tool semantic definition changed; explicit review and re-pinning required');
  return{ok:errors.length===0,errors,name,pin};
}
