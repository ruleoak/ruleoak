/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export type EngineeringMemoryRecordType='Observation'|'Incident'|'Cause'|'Decision'|'Resolution'|'Regression'|'InvariantIntroduced'|'Evidence'|'Supersession';
export type EngineeringMemoryStatus='active'|'historical'|'resolved'|'superseded';
export type EngineeringMemoryProvenanceClass='OBSERVED'|'DECLARED'|'INFERRED';
export interface EngineeringMemoryRecord {id:string;type:EngineeringMemoryRecordType;statement:string;status:EngineeringMemoryStatus;capability_ids?:string[];invariant_ids?:string[];evidence_requirement_ids?:string[];related_record_ids?:string[];trigger_terms?:string[];required_evidence_types?:string[];plan_actions?:string[];tags?:string[];observed_at?:string;effective_from?:string;effective_until?:string;provenance:{class:EngineeringMemoryProvenanceClass;method:string;source:string;confidence?:number};}
export interface EngineeringMemoryBundle {engineering_memory_version:'0.1';bundle_id:string;records:EngineeringMemoryRecord[];}
export const ENGINEERING_MEMORY_VERSIONS:readonly string[];export const ENGINEERING_MEMORY_RECORD_TYPES:readonly EngineeringMemoryRecordType[];export const ENGINEERING_MEMORY_STATUSES:readonly EngineeringMemoryStatus[];export const ENGINEERING_MEMORY_PROVENANCE:readonly EngineeringMemoryProvenanceClass[];
export function validateEngineeringMemoryBundle(bundle:unknown):{valid:boolean;isValid:boolean;errors:string[];warnings:string[];errorMessage:string};
