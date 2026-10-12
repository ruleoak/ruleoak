/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { canonicalStringify } from '../decision/receipt.js';
import { withFileLock } from '../io/file-lock.js';
import { atomicWriteFileSync, readBoundedFileSync } from '../io/durable-file.js';

export const REVOCATION_SUBJECT_TYPES = Object.freeze(['principal','authority_grant','authority_envelope','execution_lease','session']);
export const REVOCATION_REGISTRY_LIMITS = Object.freeze({ maxBytes: 8 * 1024 * 1024, maxLineBytes: 64 * 1024, maxRecords: 50_000 });

function digestPayload(record={}){const {record_digest:_ignored,...payload}=record;return payload;}
function recordDigest(record={}){return `sha256:${createHash('sha256').update(canonicalStringify(digestPayload(record))).digest('hex')}`;}
function validTime(value){const t=Date.parse(String(value||''));return Number.isFinite(t)?new Date(t).toISOString():null;}
function normalizeReason(value){return String(value||'revoked').normalize('NFKC').trim().slice(0,512)||'revoked';}
function validateRecord(record,line=null){
  const prefix=line===null?'revocation record':`revocation line ${line}`;const errors=[];
  if(!record||typeof record!=='object'||Array.isArray(record))errors.push(`${prefix} must be an object`);
  else{
    if(!['1.0','1.1'].includes(record.revocation_version))errors.push(`${prefix} revocation_version is invalid`);
    if(typeof record.revocation_id!=='string'||!record.revocation_id)errors.push(`${prefix} revocation_id is required`);
    if(!REVOCATION_SUBJECT_TYPES.includes(record.subject_type))errors.push(`${prefix} subject_type is invalid`);
    if(typeof record.subject_id!=='string'||!record.subject_id)errors.push(`${prefix} subject_id is required`);
    if(!validTime(record.revoked_at))errors.push(`${prefix} revoked_at is invalid`);
    if(typeof record.reason!=='string')errors.push(`${prefix} reason must be a string`);
    if(typeof record.cascade!=='boolean')errors.push(`${prefix} cascade must be boolean`);
    if(record.parent_id!==null&&record.parent_id!==undefined&&typeof record.parent_id!=='string')errors.push(`${prefix} parent_id must be a string or null`);
    if(record.revocation_version==='1.1'){
      if(!Number.isSafeInteger(record.sequence)||record.sequence<1)errors.push(`${prefix} sequence must be a positive safe integer`);
      if(typeof record.record_digest!=='string'||record.record_digest!==recordDigest(record))errors.push(`${prefix} record_digest mismatch`);
    }
  }
  if(errors.length)throw new Error(errors.join('; '));return record;
}
function normalizeAncestor(value){if(typeof value==='string'&&value)return{type:null,id:value,legacy:true};if(value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.id==='string'&&value.id)return{type:value.type||null,id:value.id,legacy:false};return null;}

export class RevocationRegistry {
  constructor(options = {}) { this.filePath = options.filePath || null; this.records = []; this.limits = { ...REVOCATION_REGISTRY_LIMITS, ...(options.limits || {}) }; }
  withExclusive(fn){if(this.filePath)mkdirSync(dirname(this.filePath),{recursive:true,mode:0o700});return this.filePath?withFileLock(this.filePath,fn):fn();}
  _loadUnlocked(){
    if(!this.filePath)return this.records.map(r=>structuredClone(r));
    if(!existsSync(this.filePath))return[];
    const text=readBoundedFileSync(this.filePath,{maxBytes:this.limits.maxBytes,label:'revocation registry'});
    const lines=String(text||'').split(/\r?\n/).filter(Boolean);if(lines.length>this.limits.maxRecords)throw new Error(`revocation registry exceeds maxRecords (${this.limits.maxRecords})`);
    const out=[];let lastSequence=0;
    for(let i=0;i<lines.length;i++){
      if(Buffer.byteLength(lines[i],'utf8')>this.limits.maxLineBytes)throw new Error(`revocation line ${i+1} exceeds maxLineBytes (${this.limits.maxLineBytes})`);
      let record;try{record=JSON.parse(lines[i]);}catch{throw new Error(`corrupt revocation JSON at line ${i+1}`);}
      validateRecord(record,i+1);
      if(record.revocation_version==='1.1'){if(record.sequence<=lastSequence)throw new Error(`revocation line ${i+1} sequence is not strictly increasing`);lastSequence=record.sequence;}
      out.push(record);
    }
    return out;
  }
  _persistUnlocked(records){
    if(!this.filePath){this.records=records.map(r=>structuredClone(r));return;}
    if(records.length>this.limits.maxRecords)throw new Error(`revocation registry exceeds maxRecords (${this.limits.maxRecords})`);
    const text=records.length?records.map(r=>JSON.stringify(r)).join('\n')+'\n':'';
    atomicWriteFileSync(this.filePath,text,{mode:0o600,maxBytes:this.limits.maxBytes,label:'revocation registry'});
  }
  list(options={}){const read=()=>this._loadUnlocked();if(this.filePath&&!existsSync(this.filePath))return[];return this.filePath&&!options.assumeLocked?this.withExclusive(read):read();}
  revoke(type,id,options={}){
    if(!REVOCATION_SUBJECT_TYPES.includes(type))throw new Error(`unsupported revocation subject type: ${type}`);if(!id)throw new Error('revocation id is required');
    const perform=()=>{const existing=this._loadUnlocked();const when=validTime(options.revokedAt||options.now||new Date());if(!when)throw new Error('revocation time must be a valid date-time');const lastSequence=Math.max(0,...existing.filter(r=>r.revocation_version==='1.1').map(r=>r.sequence||0));if(lastSequence>=Number.MAX_SAFE_INTEGER)throw new Error('revocation sequence exceeds safe integer range');const payload={revocation_version:'1.1',revocation_id:options.revocationId||`revoke_${randomUUID()}`,sequence:lastSequence+1,subject_type:String(type),subject_id:String(id),revoked_at:when,reason:normalizeReason(options.reason),cascade:Boolean(options.cascade),parent_id:options.parentId||null};const record={...payload,record_digest:recordDigest(payload)};validateRecord(record);this._persistUnlocked([...existing,record]);return structuredClone(record);};
    if(this.filePath)mkdirSync(dirname(this.filePath),{recursive:true,mode:0o700});return this.withExclusive(perform);
  }
  _isRevokedUnlocked(type,id,options={}){const at=Date.parse(String(options.at||options.now||new Date()));if(!Number.isFinite(at))throw new Error('revocation check time must be a valid date-time');const records=this._loadUnlocked();const direct=records.find(record=>record.subject_type===type&&record.subject_id===id&&Date.parse(record.revoked_at)<=at);if(direct)return{revoked:true,record:structuredClone(direct),via:'direct'};const ancestors=(options.ancestors||[]).map(normalizeAncestor).filter(Boolean);for(const ancestor of ancestors){const cascade=records.find(record=>record.cascade&&record.subject_id===ancestor.id&&Date.parse(record.revoked_at)<=at&&(ancestor.legacy||!ancestor.type||record.subject_type===ancestor.type));if(cascade)return{revoked:true,record:structuredClone(cascade),via:'cascade'};}return{revoked:false,record:null,via:null};}
  isRevoked(type,id,options={}){const check=()=>this._isRevokedUnlocked(type,id,options);if(this.filePath&&!existsSync(this.filePath))return{revoked:false,record:null,via:null};return this.filePath&&!options.assumeLocked?this.withExclusive(check):check();}
}
