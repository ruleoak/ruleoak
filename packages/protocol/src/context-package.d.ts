/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export declare const CONTEXT_PACKAGE_VERSIONS: readonly ['0.1'];
export declare const CONTEXT_PROVENANCE: readonly ['DETERMINISTIC','OBSERVED','DECLARED','INFERRED','UNKNOWN'];
export declare const CONTEXT_SLICE_KINDS: readonly ['implementation','test','configuration','intent'];
export declare function validateContextPackage(pkg: unknown): { valid:boolean; isValid:boolean; errors:string[]; warnings:string[]; errorMessage:string };
