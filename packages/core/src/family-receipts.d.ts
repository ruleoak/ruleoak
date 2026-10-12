/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import type {EvidenceEnvelope, Claim, Dimension} from '@ruleoak/protocol/family';
export interface FamilyReceipt {
 receiptVersion:'1.0'; verifierId:string; dimension:Dimension; assertion:'supported'|'contradicted';
 evidenceSha256:string; bindingSha256:string; issuedAt:string; expiresAt:string; signature:string;
}
export function familyReceiptBinding(envelope:EvidenceEnvelope):string;
export function signFamilyReceipt(envelope:EvidenceEnvelope, options:{verifierId:string;dimension:Dimension;assertion:'supported'|'contradicted';evidenceSha256:string;issuedAt:string;expiresAt:string;privateKey:string}):FamilyReceipt;
export function familyReceiptClaim(receipt:FamilyReceipt):Claim;
export function verifyFamilyReceipt(claim:Claim,envelope:EvidenceEnvelope,receipt:FamilyReceipt,options:{publicKey:string;expectedVerifierId:string;allowedDimensions:Dimension[];now:string;verifyEvidence:(digest:string,receipt:FamilyReceipt,envelope:EvidenceEnvelope)=>boolean}):boolean;
