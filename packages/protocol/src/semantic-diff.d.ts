/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export type SemanticDiffProvenance='DETERMINISTIC'|'OBSERVED'|'INFERRED'|'UNKNOWN';
export type SemanticDiffChangeType='added'|'removed'|'modified';
export interface SemanticDiffValidationResult{valid:boolean;isValid:boolean;errors:string[];warnings:string[];errorMessage:string;}
export const SEMANTIC_DIFF_VERSIONS:readonly ['0.1'];
export const SEMANTIC_DIFF_PROVENANCE:readonly SemanticDiffProvenance[];
export const SEMANTIC_DIFF_CHANGE_TYPES:readonly SemanticDiffChangeType[];
export const SEMANTIC_DIFF_DIRECTIONS:readonly ('strengthened'|'weakened'|'changed'|'unchanged')[];
export function validateSemanticDiff(report:unknown):SemanticDiffValidationResult;
