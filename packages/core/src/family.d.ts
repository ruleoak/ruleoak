/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import type {EvidenceEnvelope, Subject, ReleaseRef, Claim, Json, Dimension, FamilyRelease, PackageArtifact, Qualification, CompatibilityRecord} from '@ruleoak/protocol/family';
export function familyJsonSha256(value: unknown): string;
export function sealEvidenceEnvelope(value: Omit<EvidenceEnvelope,'payloadSha256' | 'envelopeSha256'>): EvidenceEnvelope;
export interface EvidenceOptions {
 now: string; expectedSubject: Subject; expectedScope: string; revokedEnvelopeIds: string[]; revocationCheckedAt: string; revocationValidUntil: string;
 acceptProducer: (producer: Readonly<ReleaseRef>) => boolean;
 payloadValidators: Map<string,(payload: Json) => boolean>;
 verifyClaim?: (claim: Readonly<Claim>, envelope: Readonly<EvidenceEnvelope>) => boolean;
}
export interface EvidenceAssessment {valid: boolean; integrity: 'matched' | 'not_established'; dimensions: Record<Dimension,'supported' | 'contradicted' | 'not_established'>; errors: string[]; authorityTransferred: false}
export function assessEvidenceEnvelope(value: unknown, options: EvidenceOptions): EvidenceAssessment;
export function resolveFamilyRelease(registry: unknown, reference: ReleaseRef, expectedRegistrySha256: string): Readonly<FamilyRelease>;
export function verifyFamilyPackageSet(release: FamilyRelease, observed: PackageArtifact[]): boolean;
/** Pass only a release resolved from an externally pinned registry. */
export function assessFamilyQualification(release: FamilyRelease, options: {kind: Qualification['kind']; platform: string; now: string; verifyEvidence: (evidence: Readonly<Qualification>) => boolean}): boolean;
export function assessFamilyCompatibility(record: unknown, options: {consumer: ReleaseRef; dependency: ReleaseRef; adapterVersion: string; platform: string; suiteSha256: string; now: string; verifyEvidence: (evidence: Readonly<CompatibilityRecord>) => boolean}): boolean;

export function resolveFamilyDependencySet(registry: unknown, reference: ReleaseRef, expectedRegistrySha256: string): readonly Readonly<FamilyRelease>[];
