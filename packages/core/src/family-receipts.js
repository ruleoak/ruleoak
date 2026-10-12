/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {createPrivateKey, createPublicKey, sign, verify} from 'node:crypto';
import {canonicalFamilyJson, validateEvidenceEnvelope} from '@ruleoak/protocol/family';
import {familyJsonSha256} from './family.js';

const dimensions = new Set(['binding','semantic_support','workload_qualification','effect_confirmation','human_review']);
const iso = s => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s) && Number.isFinite(Date.parse(s));
const digest = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
function checkedEnvelope(envelope) {
  const e=JSON.parse(canonicalFamilyJson(envelope));
  if (!validateEvidenceEnvelope(e).valid) throw new TypeError('invalid evidence envelope');
  const {envelopeSha256,...content}=e;
  if (familyJsonSha256(content)!==envelopeSha256 || familyJsonSha256(e.payload)!==e.payloadSha256) throw new TypeError('envelope integrity mismatch');
  return e;
}

// Claims are excluded to avoid a signature/digest cycle. Every subject, payload,
// source, identity and lifetime field remains bound; the receipt binds its own claim.
export function familyReceiptBinding(envelope) {
  const {claims,envelopeSha256,...content}=checkedEnvelope(envelope);
  return familyJsonSha256(content);
}

export function signFamilyReceipt(envelope,{verifierId,dimension,assertion,evidenceSha256,issuedAt,expiresAt,privateKey}={}) {
  const e=checkedEnvelope(envelope);
  if(typeof verifierId!=='string'||!verifierId.trim()||verifierId.length>200||!dimensions.has(dimension)||!['supported','contradicted'].includes(assertion)||!digest(evidenceSha256)) throw new TypeError('invalid receipt claim');
  if(!iso(issuedAt)||!iso(expiresAt)||Date.parse(issuedAt)<Date.parse(e.createdAt)||Date.parse(expiresAt)>Date.parse(e.expiresAt)||Date.parse(expiresAt)<=Date.parse(issuedAt)) throw new TypeError('invalid receipt lifetime');
  const key=createPrivateKey(privateKey);
  if(key.asymmetricKeyType!=='ed25519') throw new TypeError('Ed25519 key required');
  const statement={receiptVersion:'1.0',verifierId,dimension,assertion,evidenceSha256,bindingSha256:familyReceiptBinding(e),issuedAt,expiresAt};
  return {...statement,signature:sign(null,Buffer.from(canonicalFamilyJson(statement)),key).toString('base64')};
}

export function familyReceiptClaim(receipt) {
  return {dimension:receipt.dimension,assertion:receipt.assertion,verifierId:receipt.verifierId,evidenceSha256:familyJsonSha256(receipt)};
}

// Trusted callers select the key, verifier and permitted dimensions. No key or
// callback supplied by an imported envelope is used. Signature != claim truth.
export function verifyFamilyReceipt(claim,envelope,receipt,{publicKey,expectedVerifierId,allowedDimensions,now,verifyEvidence}={}) {
  try {
    const r=JSON.parse(canonicalFamilyJson(receipt));
    const names=['receiptVersion','verifierId','dimension','assertion','evidenceSha256','bindingSha256','issuedAt','expiresAt','signature'];
    if(Object.keys(r).length!==names.length||Object.keys(r).some(k=>!names.includes(k))||r.receiptVersion!=='1.0')return false;
    if(r.verifierId!==expectedVerifierId||!Array.isArray(allowedDimensions)||!allowedDimensions.includes(r.dimension)||!dimensions.has(r.dimension)||!['supported','contradicted'].includes(r.assertion)||!digest(r.evidenceSha256))return false;
    const e=checkedEnvelope(envelope);
    if(!iso(now)||!iso(r.issuedAt)||!iso(r.expiresAt)||Date.parse(now)<Date.parse(r.issuedAt)||Date.parse(now)>=Date.parse(r.expiresAt)||Date.parse(r.issuedAt)<Date.parse(e.createdAt)||Date.parse(r.expiresAt)>Date.parse(e.expiresAt))return false;
    if(canonicalFamilyJson(claim)!==canonicalFamilyJson(familyReceiptClaim(r))||r.bindingSha256!==familyReceiptBinding(e))return false;
    if(typeof r.signature!=='string'||! /^[A-Za-z0-9+/]{86}==$/.test(r.signature))return false;
    const key=createPublicKey(publicKey),{signature,...statement}=r;
    if(key.asymmetricKeyType!=='ed25519'||!verify(null,Buffer.from(canonicalFamilyJson(statement)),key,Buffer.from(signature,'base64')))return false;
    // Signature authenticates who asserted the dimension. Consumers must also
    // authenticate/recompute the actual receipt evidence bytes.
    if(typeof verifyEvidence!=='function')return false;
    const result=verifyEvidence(r.evidenceSha256,r,e);
    if(result&&typeof result.then==='function'){Promise.resolve(result).catch(()=>{});return false;}
    return result===true;
  }catch{return false;}
}
