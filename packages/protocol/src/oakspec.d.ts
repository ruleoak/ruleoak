/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export const OAKSPEC_VERSIONS: readonly ['1.0'];
export const OAKSPEC_ECOSYSTEM_MATURITY: 'preview';
export const OAKSPEC_EXTERNAL_STANDARD_STATUS: 'NOT_CLAIMED';
export const OAKSPEC_ADAPTERS: readonly ['openapi','tests','ci','git','agents','docs','mcp'];
export const OAKSPEC_CANDIDATE_STATUS: 'CANDIDATE';
export const OAKSPEC_PROVENANCE: readonly ['DECLARED','OBSERVED','INFERRED','UNKNOWN'];
export const OAKSPEC_SEMANTIC_PROVENANCE: readonly ['DETERMINISTIC','OBSERVED','INFERRED','UNKNOWN'];
export function canonicalOakSpecJson(value: unknown): string;
export function validateOakSpec(value: unknown): {valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
export function validateOakSpecCandidateBundle(value: unknown): {valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
export function exportIntentToOakSpec(intent: unknown): unknown;
