/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
export type Json = null | boolean | number | string | Json[] | {[key: string]: Json};
export type Dimension = 'binding' | 'semantic_support' | 'workload_qualification' | 'effect_confirmation' | 'human_review';
export type Assertion = 'supported' | 'contradicted' | 'unknown';
export interface ReleaseRef {product: string; releaseId: string; sourceSha256: string}
export interface Subject {kind: string; id: string; sha256: string}
export interface PayloadSchema {id: string; version: string}
export interface Claim {dimension: Dimension; assertion: Assertion; verifierId: string; evidenceSha256: string}
export interface EvidenceEnvelope {
 schemaVersion: '1.0'; id: string; producer: ReleaseRef; subject: Subject; scope: string;
 payloadSchema: PayloadSchema; payload: Json; payloadSha256: string;
 sources: {id: string; originalSha256: string; extractionSha256: string | null}[];
 createdAt: string; expiresAt: string; claims: Claim[]; envelopeSha256: string;
}
export interface PackageArtifact {name: string; version: string; artifactSha256: string}
export interface Qualification {kind: 'source_tests' | 'native_runtime'; platform: string; sourceSha256: string; artifactSha256: string; checkedAt: string; expiresAt: string; verifierId: string}
export interface FamilyRelease {ref: ReleaseRef; version: string; sourceArtifact: string; availability: 'available' | 'reference_only'; packages: PackageArtifact[]; schemas: PayloadSchema[]; dependencies: ReleaseRef[]; qualification: Qualification[]}
export interface FamilyRegistry {schemaVersion: '1.0'; releases: FamilyRelease[]}
export interface CompatibilityRecord {schemaVersion: '1.0'; consumer: ReleaseRef; dependency: ReleaseRef; adapterVersion: string; platform: string; suiteSha256: string; resultSha256: string; checkedAt: string; expiresAt: string; verifierId: string; outcome: 'pass' | 'fail'}
export interface Validation {valid: boolean; errors: string[]}
export const FAMILY_CONTRACT_VERSION: '1.0';
export const VERIFICATION_DIMENSIONS: readonly Dimension[];
export function canonicalFamilyJson(value: unknown): string;
export function validateEvidenceEnvelope(value: unknown): Validation;
export function validateFamilyRegistry(value: unknown): Validation;
export function validateCompatibilityRecord(value: unknown): Validation;
