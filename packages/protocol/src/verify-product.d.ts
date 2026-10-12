/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export const VERIFY_PRODUCT_VERSIONS: readonly ['0.1'];
export const VERIFY_PRODUCT_MODES: readonly ['OBSERVE','VERIFY','GOVERN'];
export const VERIFY_PRODUCT_DECISIONS: readonly ['PASS','REVIEW','BLOCK'];
export const VERIFY_PRODUCT_PROVENANCE: readonly ['DETERMINISTIC','OBSERVED','INFERRED','UNKNOWN'];
export function validateVerifyProductReport(report: unknown): { valid:boolean; isValid:boolean; errors:string[]; errorMessage:string };
