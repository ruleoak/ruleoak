/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export type IntentChangeStatus='READY'|'BLOCKED'|'APPLIED_VERIFICATION_REQUIRED'|'APPLIED_VERIFIED'|'REJECTED';
export type IntentChangeRole='planner'|'implementer'|'reviewer'|'evidence_adjudicator';
export type ImplementationProducerKind='agent'|'model'|'human'|'deterministic_tool';
export interface ValidationResult{valid:boolean;isValid:boolean;errors:string[];warnings:string[];errorMessage:string;}
export const INTENT_CHANGE_VERSIONS:readonly ['0.1'];
export const IMPLEMENTATION_PROPOSAL_VERSIONS:readonly ['0.1'];
export const INTENT_CHANGE_STATUSES:readonly IntentChangeStatus[];
export const INTENT_CHANGE_ROLES:readonly IntentChangeRole[];
export const IMPLEMENTATION_PROPOSAL_OPERATIONS:readonly ('write'|'delete')[];
export const IMPLEMENTATION_PRODUCER_KINDS:readonly ImplementationProducerKind[];
export function validateIntentChangePlan(plan:unknown):ValidationResult;
export function validateImplementationProposal(proposal:unknown):ValidationResult;
