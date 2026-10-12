/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export const DEVELOPMENT_LEARNING_VERSIONS: readonly ['0.1'];
export const DEVELOPMENT_LEARNING_STATUSES: readonly string[];
export const DEVELOPMENT_LEARNING_CANDIDATE_KINDS: readonly string[];
export const DEVELOPMENT_LEARNING_PROMOTION_STATUSES: readonly string[];
export function validateDevelopmentLearningProposal(value: unknown): {valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
export function validateDevelopmentLearningPromotion(value: unknown): {valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
