/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export type IntentEvidenceClass='STATIC'|'UNIT'|'INTEGRATION'|'PROPERTY'|'BUILD'|'RUNTIME'|'DEVICE'|'EXTERNAL'|'MANUAL'|'MODEL_INFERENCE';
export type IntentEvidenceStatus='PASS'|'FAIL'|'UNKNOWN'|'NOT_RUN'|'STALE'|'CONFLICTED';
export type IntentEvidenceProducerKind='tool'|'test_runner'|'ci'|'runtime'|'device'|'external_system'|'human'|'model'|'agent'|'unknown';
export type IntentEvidenceVerificationMethod='deterministic_check'|'test_execution'|'static_analysis'|'runtime_observation'|'device_observation'|'external_observation'|'manual_review'|'signed_attestation'|'model_inference'|'self_assertion'|'unknown';
export interface IntentEvidenceProvenance {producer_kind:IntentEvidenceProducerKind;producer_id:string;verification_method:IntentEvidenceVerificationMethod;source?:string;}
export interface IntentEvidenceAttestation {format:'ruleoak-signed-digest-v1';algorithm:'ed25519';key_id:string;subject_digest:string;signature_base64:string;}
export interface IntentObservation {id:string;status:IntentEvidenceStatus;statement:string;provenance:IntentEvidenceProvenance;observed_at?:string;valid_from?:string;valid_until?:string;artifact?:{path?:string;digest?:string;size_bytes?:number;media_type?:string};attestation?:IntentEvidenceAttestation;supersedes_ids?:string[];}
export interface IntentEvidenceRecord {id:string;evidence_class:IntentEvidenceClass;statement:string;aggregation?:'all'|'any';observation_ids:string[];claim_ids?:string[];evidence_requirement_ids?:string[];capability_ids?:string[];}
export interface IntentEvidenceBundle {evidence_authority_version:'0.1';bundle_id:string;intent_manifest_id:string;observations:IntentObservation[];evidence:IntentEvidenceRecord[];}
export const INTENT_EVIDENCE_AUTHORITY_VERSIONS:readonly ['0.1'];
export const INTENT_EVIDENCE_CLASSES:readonly IntentEvidenceClass[];
export const INTENT_EVIDENCE_STATUSES:readonly IntentEvidenceStatus[];
export const INTENT_EVIDENCE_PRODUCER_KINDS:readonly IntentEvidenceProducerKind[];
export const INTENT_EVIDENCE_VERIFICATION_METHODS:readonly IntentEvidenceVerificationMethod[];
export const INTENT_EVIDENCE_AGGREGATIONS:readonly ['all','any'];
export function validateIntentEvidenceBundle(bundle:unknown):{valid:boolean;isValid:boolean;errors:string[];warnings:string[];errorMessage:string};
export function normalizeIntentEvidenceBundle(bundle:IntentEvidenceBundle):IntentEvidenceBundle;
export function canonicalIntentEvidenceJson(bundle:IntentEvidenceBundle):string;
export function validateIntentVerificationResult(report:unknown):{valid:boolean;isValid:boolean;errors:string[];warnings?:string[];errorMessage:string};
