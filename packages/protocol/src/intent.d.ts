/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export type IntentManifestVersion='0.1';
export type IntentRiskLevel='low'|'medium'|'high'|'critical';
export type IntentEvidenceType='static'|'unit'|'integration'|'property'|'build'|'runtime'|'device'|'external'|'manual';
export type IntentAuthorityKind='design_source'|'state_source'|'decision_owner'|'external_contract';
export type IntentDependencyType='required'|'optional'|'data'|'control'|'behavior';
export type IntentConstraintType='functional'|'non_functional'|'privacy'|'security'|'compatibility'|'platform'|'operational';
export type IntentBudgetOperator='max'|'min'|'exact'|'range';
export type IntentDecisionStatus='proposed'|'accepted'|'superseded';
export type IntentIncidentStatus='open'|'resolved';
export interface IntentExtensions { [namespacedKey:string]:unknown }
export interface IntentProduct { id:string;name:string;summary?:string;version?:string;extensions?:IntentExtensions }
export interface IntentEntityBase { id:string;name?:string;summary?:string;tags?:string[];extensions?:IntentExtensions }
export interface IntentCapability extends IntentEntityBase { goal_ids?:string[];dependency_ids?:string[];invariant_ids?:string[];constraint_ids?:string[];budget_ids?:string[];authority_ids?:string[];risk_ids?:string[];failure_mode_ids?:string[];fallback_ids?:string[];evidence_requirement_ids?:string[] }
export interface IntentGoal extends IntentEntityBase { statement:string;capability_ids?:string[] }
export interface IntentScenario extends IntentEntityBase { given:string[];when:string[];then:string[];capability_ids?:string[];invariant_ids?:string[] }
export interface IntentInvariant extends IntentEntityBase { statement:string;capability_ids?:string[] }
export interface IntentConstraint extends IntentEntityBase { statement:string;constraint_type:IntentConstraintType;capability_ids?:string[] }
export interface IntentBudget extends IntentEntityBase { metric:string;operator:IntentBudgetOperator;value?:number;min_value?:number;max_value?:number;unit?:string;capability_ids?:string[] }
export interface IntentAuthority extends IntentEntityBase { statement:string;authority_kind:IntentAuthorityKind;source:string;capability_ids?:string[] }
export interface IntentDependency extends IntentEntityBase { from_capability_id:string;to_capability_id:string;dependency_type:IntentDependencyType;statement?:string }
export interface IntentRisk extends IntentEntityBase { statement:string;severity:IntentRiskLevel;capability_ids?:string[];invariant_ids?:string[] }
export interface IntentFailureMode extends IntentEntityBase { statement:string;capability_ids?:string[];fallback_ids?:string[] }
export interface IntentFallback extends IntentEntityBase { statement:string;capability_ids?:string[] }
export interface IntentEvidenceRequirement extends IntentEntityBase { statement:string;evidence_types:IntentEvidenceType[];capability_ids?:string[] }
export interface IntentClaim extends IntentEntityBase { statement:string;capability_ids?:string[];invariant_ids?:string[];evidence_requirement_ids?:string[] }
export interface IntentDecision extends IntentEntityBase { statement:string;status:IntentDecisionStatus;capability_ids?:string[];supersedes_decision_ids?:string[] }
export interface IntentIncident extends IntentEntityBase { statement:string;status:IntentIncidentStatus;capability_ids?:string[];invariant_ids?:string[];decision_ids?:string[] }
export interface IntentManifest {
  intent_manifest_version:IntentManifestVersion;
  manifest_id:string;
  product:IntentProduct;
  capabilities:IntentCapability[];
  goals?:IntentGoal[];
  scenarios?:IntentScenario[];
  invariants?:IntentInvariant[];
  constraints?:IntentConstraint[];
  budgets?:IntentBudget[];
  authorities?:IntentAuthority[];
  dependencies?:IntentDependency[];
  risks?:IntentRisk[];
  failure_modes?:IntentFailureMode[];
  fallbacks?:IntentFallback[];
  evidence_requirements?:IntentEvidenceRequirement[];
  claims?:IntentClaim[];
  decisions?:IntentDecision[];
  incidents?:IntentIncident[];
  extensions?:IntentExtensions;
}
export interface IntentValidationResult { valid:boolean;isValid:boolean;errors:string[];warnings:string[];errorMessage:string }
export const INTENT_MANIFEST_VERSIONS:readonly ['0.1'];
export const INTENT_ENTITY_COLLECTIONS:readonly string[];
export const INTENT_EVIDENCE_TYPES:readonly IntentEvidenceType[];
export const INTENT_RISK_LEVELS:readonly IntentRiskLevel[];
export const INTENT_DECISION_STATUSES:readonly IntentDecisionStatus[];
export const INTENT_INCIDENT_STATUSES:readonly IntentIncidentStatus[];
export const INTENT_AUTHORITY_KINDS:readonly IntentAuthorityKind[];
export const INTENT_DEPENDENCY_TYPES:readonly IntentDependencyType[];
export const INTENT_BUDGET_OPERATORS:readonly IntentBudgetOperator[];
export const INTENT_CONSTRAINT_TYPES:readonly IntentConstraintType[];
export function validateIntentManifest(manifest:unknown):IntentValidationResult;
export function normalizeIntentManifest(manifest:unknown):unknown;
export function canonicalIntentJson(manifest:unknown):string;
export function summarizeIntentManifest(manifest:unknown):{intent_manifest_version:string|null;manifest_id:string|null;product_id:string|null;product_name:string|null;valid:boolean;errors:string[];warnings:string[];counts:Record<string,number>};
export function intentEntityCollectionForKind(kind:string):string|null;
