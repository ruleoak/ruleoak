/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export declare const MULTI_FRONTEND_DEVELOPMENT_VERSIONS: readonly ['0.1'];
export declare const MULTI_FRONTEND_MODES: readonly ['managed','external'];
export declare const MULTI_FRONTEND_SURFACES: readonly ['cli','api','chat','external-agent'];
export declare function validateMultiFrontendDevelopmentReport(report: unknown): {valid:boolean;isValid:boolean;errors:string[];errorMessage:string};
