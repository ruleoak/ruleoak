/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalStringify, verifyExecutionGrant } from './receipt.js';
import { durableExclusiveCreateSync, readBoundedFileSync } from '../io/durable-file.js';

const MAX_MARKER_BYTES=64*1024;
function safeMarkerName(receipt = {}) { const source = `${receipt.decision_id || ''}:${receipt.nonce || ''}:${receipt.action_digest || ''}`; return createHash('sha256').update(source).digest('hex'); }
function ensurePrivateDir(path) { mkdirSync(path, { recursive: true, mode: 0o700 }); if (process.platform !== 'win32') chmodSync(path, 0o700); }
function readMarker(path){try{return JSON.parse(readBoundedFileSync(path,{maxBytes:MAX_MARKER_BYTES,label:'execution grant marker'}));}catch{return null;}}
export function executionGrantMarkerPath(storeDir, receipt) { if (!storeDir) throw new Error('execution grant storeDir is required for replay protection'); return resolve(storeDir, `${safeMarkerName(receipt)}.json`); }
export function listConsumedExecutionGrants(storeDir) { if (!storeDir || !existsSync(storeDir)) return []; return readdirSync(storeDir).filter(name => name.endsWith('.json')).map(name => readMarker(resolve(storeDir,name))).filter(Boolean).sort((a,b)=>String(a.consumed_at).localeCompare(String(b.consumed_at))); }
export function consumeExecutionGrant(receipt,input,policy,secret,options={}){
  const requireSignature=options.requireSignature!==false;
  if(requireSignature&&!secret)return{ok:false,consumed:false,replayed:false,errors:['RULEOAK_RECEIPT_SECRET is required to consume a signed execution grant'],receipt};
  const verification=verifyExecutionGrant(receipt,input,policy,secret,{now:options.now,requireSignature,audience:options.audience});if(!verification.ok)return{...verification,consumed:false,replayed:false};
  if(!options.storeDir)return{ok:false,consumed:false,replayed:false,errors:['execution grant storeDir is required for replay protection'],receipt};
  const storeDir=resolve(options.storeDir);ensurePrivateDir(storeDir);const markerPath=executionGrantMarkerPath(storeDir,receipt);const consumed=new Date(options.consumedAt||options.now||new Date());if(!Number.isFinite(consumed.getTime()))return{ok:false,consumed:false,replayed:false,errors:['execution grant consumedAt is invalid'],receipt};
  const marker={consumption_version:'1.0',decision_id:receipt.decision_id,nonce:receipt.nonce||null,action_digest:receipt.action_digest,policy_digest:receipt.policy_digest,consumed_at:consumed.toISOString(),expires_at:receipt.expires_at,executor:options.executor||'unknown-executor',audience:receipt.audience||null,receipt_signature_present:Boolean(receipt.signature),receipt_digest:`sha256:${createHash('sha256').update(canonicalStringify(receipt)).digest('hex')}`};
  const created=durableExclusiveCreateSync(markerPath,JSON.stringify(marker,null,2)+'\n',{mode:0o600});
  if(!created.created){const existing=readMarker(markerPath);return{ok:false,consumed:false,replayed:true,errors:[`execution grant already consumed: ${receipt.decision_id}${existing?'':' (marker unreadable)'}`],receipt,markerPath,existing};}
  return{ok:true,consumed:true,replayed:false,errors:[],receipt,marker,markerPath};
}
export class ExecutionGrantConsumer{constructor(options={}){if(!options.storeDir)throw new Error('ExecutionGrantConsumer requires storeDir');this.storeDir=resolve(options.storeDir);this.secret=options.secret;this.requireSignature=options.requireSignature!==false;this.audience=options.audience;this.executor=options.executor||'unknown-executor';}consume(receipt,input,policy,options={}){return consumeExecutionGrant(receipt,input,policy,options.secret??this.secret,{...options,storeDir:options.storeDir||this.storeDir,requireSignature:options.requireSignature??this.requireSignature,audience:options.audience??this.audience,executor:options.executor||this.executor});}list(){return listConsumedExecutionGrants(this.storeDir);}}
