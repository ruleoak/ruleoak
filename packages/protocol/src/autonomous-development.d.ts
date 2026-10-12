/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export declare const AUTONOMOUS_DEVELOPMENT_VERSIONS: readonly string[];
export declare const AUTONOMOUS_DEVELOPMENT_STATUSES: readonly string[];
export declare const AUTONOMOUS_STOP_REASONS: readonly string[];
export declare function validateAutonomousDevelopmentReport(value: unknown): {valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
