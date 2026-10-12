/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export type ModelExecutionRole='planner'|'implementer'|'reviewer'|'reasoning';
export type ModelProviderKind='deterministic'|'hosted';
export type ModelExecutionStatus='COMPLETED'|'NOT_RUN'|'FAILED';
export interface ModelProviderDescriptor{provider_id:string;kind:ModelProviderKind;roles:ModelExecutionRole[];network_required:boolean;model?:string|null;configured?:boolean;}
export interface ModelUsage{kind:'EXACT_PROVIDER'|'ESTIMATED_LOCAL'|'NOT_RUN';input_tokens?:number;output_tokens?:number;total_tokens?:number;currency?:string|null;estimated_cost?:number|null;}
export interface ModelExecutionResult{model_execution_version:'0.1';execution_id:string;role:ModelExecutionRole;status:ModelExecutionStatus;authority:'NON_AUTHORITATIVE';provider:ModelProviderDescriptor;input:Record<string,unknown>;output:Record<string,unknown>;usage:ModelUsage;evidence_authority:'EXTERNAL_TO_MODEL_EXECUTION';tool_authority:'EXTERNAL_TO_MODEL_EXECUTION';}
export const MODEL_EXECUTION_VERSIONS:readonly string[];export const MODEL_EXECUTION_ROLES:readonly ModelExecutionRole[];export const MODEL_PROVIDER_KINDS:readonly ModelProviderKind[];export const MODEL_EXECUTION_STATUSES:readonly ModelExecutionStatus[];export const MODEL_EXECUTION_AUTHORITIES:readonly string[];export const MODEL_USAGE_KINDS:readonly string[];
export function validateModelProviderDescriptor(v:unknown):{valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
export function validateModelExecutionRequest(v:unknown):{valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
export function validateModelExecutionResult(v:unknown):{valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
