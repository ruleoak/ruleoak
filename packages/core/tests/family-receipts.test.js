/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {sealEvidenceEnvelope as seal,familyJsonSha256 as sha} from '@ruleoak/core/family';
import {signFamilyReceipt,verifyFamilyReceipt,familyReceiptClaim} from '@ruleoak/core/family-receipts';
const {privateKey,publicKey}=generateKeyPairSync('ed25519',{privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const now='2026-09-13T00:00:00.000Z',end='2026-09-14T00:00:00.000Z';
const e=seal({schemaVersion:'1.0',id:'receipt-test',producer:{product:'test',releaseId:'fixture-release-1',sourceSha256:sha('source')},subject:{kind:'decision',id:'test',sha256:sha('subject')},scope:'staging',payloadSchema:{id:'test',version:'1'},payload:{text:'actual reviewed bytes'},sources:[],createdAt:now,expiresAt:end,claims:[]});
const r=signFamilyReceipt(e,{verifierId:'reviewer',dimension:'human_review',assertion:'supported',evidenceSha256:sha('actual review record'),issuedAt:now,expiresAt:end,privateKey});
const claim=familyReceiptClaim(r),signed=seal({...e,claims:[claim]});
const opts={publicKey,expectedVerifierId:'reviewer',allowedDimensions:['human_review'],now,verifyEvidence:h=>h===sha('actual review record')};
let count=0;
const check=(expected,c=claim,env=signed,receipt=r,options=opts)=>{assert.equal(verifyFamilyReceipt(c,env,receipt,options),expected);count++;};
check(true);
for(const patch of [{now:end},{expectedVerifierId:'other'},{allowedDimensions:['semantic_support']},{verifyEvidence:undefined},{verifyEvidence:()=>false},{verifyEvidence:async()=>true},{publicKey:'invalid'}])check(false,claim,signed,r,{...opts,...patch});
for(const patch of [{signature:'A'.repeat(86)+'=='},{assertion:'contradicted'},{evidenceSha256:sha('other')},{issuedAt:end},{extra:true}])check(false,claim,signed,{...r,...patch});
for(const patch of [{scope:'production'},{subject:{...e.subject,id:'other'}},{payload:{text:'changed'}},{producer:{...e.producer,releaseId:'fixture-release-2'}},{sources:[{id:'new',originalSha256:sha('new'),extractionSha256:null}]}])check(false,claim,seal({...e,...patch,claims:[claim]}));
check(false,{...claim,dimension:'semantic_support'});
assert.throws(()=>signFamilyReceipt(e,{verifierId:'reviewer',dimension:'human_review',assertion:'supported',evidenceSha256:sha('x'),issuedAt:now,expiresAt:'2027-01-01T00:00:00.000Z',privateKey}));count++;
console.log(`family receipt authentication PASS: ${count} cases`);
