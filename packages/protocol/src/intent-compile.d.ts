/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export declare const INTENT_RECOMPILE_VERSIONS: readonly ['0.1'];
export declare const INTENT_RECOMPILE_STATUSES: readonly ['DRY_RUN_READY','GENERATED','VERIFIED','FAILED'];
export declare const INTENT_RECOMPILE_AUTHORITIES: readonly ['NON_AUTHORITATIVE_SYNTHESIS'];
export declare function validateIntentRecompilePackage(value: unknown): { valid: boolean; isValid: boolean; errors: string[]; errorMessage: string };
export declare function validateIntentRecompileReport(value: unknown): { valid: boolean; isValid: boolean; errors: string[]; errorMessage: string };
