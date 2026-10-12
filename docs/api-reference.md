# Public API reference

RuleOak v0.50.0 publishes ESM packages for Node.js 22 or later. CI tests Node.js 22 and 24 LTS and Node.js 26 Current. Protocol and core include TypeScript declarations

## `@ruleoak/protocol`

Primary exports:

- `validateActionEnvelope`
- `validateNormalizedToolCall`
- `validatePolicy`
- `validateDecisionReceipt`
- `validateEvidenceEvent`
- `normalizeDecisionAction`
- protocol constants and TypeScript types

```js
import { validatePolicy } from '@ruleoak/protocol';

const result = validatePolicy(policy);
if (!result.valid) throw new Error(result.errorMessage);
```

## `@ruleoak/core`

Primary exports:

- `evaluatePolicy`
- `evaluatePermissionRequest`
- `classifyRisk`
- `lintPolicy`
- `EvidenceRecorder`
- `verifyEvidence`
- `buildDecisionReceipt`
- `signDecisionReceipt`
- `verifyDecisionReceipt`
- `verifyExecutionGrant`

```js
import {
  evaluatePermissionRequest,
  verifyExecutionGrant
} from '@ruleoak/core';

const result = evaluatePermissionRequest(call, policy, {
  evaluatedAt: new Date().toISOString(),
  receiptSecret: process.env.RULEOAK_RECEIPT_SECRET
});

if (result.decision.action === 'allow') {
  const verification = verifyExecutionGrant(
    result.decision.receipt,
    call,
    policy,
    process.env.RULEOAK_RECEIPT_SECRET
  );
  if (!verification.ok) throw new Error(verification.errors.join('; '));
  // Execute only after successful verification
}
```

## CrashLab reliability scorecard APIs

`@ruleoak/protocol` exports `RELIABILITY_SCORECARD_VERSIONS`, `RELIABILITY_SCORECARD_DIMENSIONS`, and the public `reliability-scorecard.schema.json`.

`@ruleoak/core` exports `buildReliabilityScorecard`, `reliabilityScorecardExitCode`, `renderReliabilityScorecardSummary`, `serializeReliabilityScorecardJson`, `serializeReliabilityScorecardJUnit`, and `serializeReliabilityScorecardSarif`. The scorecard is decomposable and intentionally has no scalar safety score.

## Public API maturity

RuleOak v0.50.0 assigns every public package, export family, CLI command, protocol contract, Extension SPI version and protocol schema a maturity level. Read the shipped metadata through `@ruleoak/protocol/stability/api-maturity.json`. `stable-api-snapshot.json` is cumulative over retained historical stability floors.

The RuleOak packages themselves remain preview. Selected conformance-tested protocol contracts and Extension SPI v1.0 are stable. Reliability Scorecard v1.0 and most Core/CLI surfaces remain preview.

## Compatibility guidance

RuleOak is pre-1.0. Import only from documented package root/subpath exports. Stable-labeled surfaces follow the v0.50 deprecation policy; preview and experimental surfaces may evolve before 1.0 with explicit migration notes. Do not depend on internal source paths.


## Integration reliability APIs

`@ruleoak/core` exports:

- `consumeExecutionGrant`
- `ExecutionGrantConsumer`
- `listConsumedExecutionGrants`
- `migratePolicyToV2`
- `detectPolicyVersion`
- `ApprovalBroker`
- `MemoryApprovalProvider`
- `buildApprovalRequest`
- `validateApprovalProvider`

The CLI exports helpers for file-queue approvals, receipt consumption, execution, and policy migration

## Low-friction adapter APIs

`@ruleoak/core` also exports:

- `authorize`
- `guardFunction`
- `guardTools`
- `RuleOakAuthorizationError`
- `adaptAuthorizationRequest`
- `adaptOpenAIToolCall`
- `adaptMcpToolCall`
- `adaptShellCommand`
- `adaptFilesystemAction`
- `adaptHttpAction`

```js
import { guardTools } from '@ruleoak/core'

const guardedTools = guardTools(tools, {
  policy,
  actor: { type: 'agent', name: 'coding-agent', session_id: 'session-1' },
  onApproval: async result => approvalProvider.request(result)
})
```

The basic adapter functions normalize only. `guardFunction` and `guardTools` are explicit executor wrappers that refuse execution without an allow or approved result

## Capability identity, evidence, and history

`@ruleoak/core` exports `buildCapabilityIdentity`, `buildCapabilityEvidence`, `capabilitySurfaceFingerprint`, and `migrateCapabilityManifestToV12`. `@ruleoak/protocol` exports the corresponding validators and version/evidence-class constants. Capability Manifest v1.2 is the current Inspector format; v1.0/v1.1 remain accepted for compatibility. The current API additionally exports `classifyCapabilityDrift`, `buildCapabilityObservation`, `observeCapabilityManifest`, `queryCapabilityHistory`, `FileCapabilityHistoryStore`, and the `CapabilityObservation v1` protocol validator/schema.


## Authority Graph

`@ruleoak/protocol` exports `AuthorityGraph`, `AuthorityGraphNode`, `AuthorityGraphEdge`, `AuthorityGraphUnresolvedReference`, `AUTHORITY_GRAPH_VERSIONS`, `AUTHORITY_GRAPH_NODE_KINDS`, and `validateAuthorityGraph`.

`@ruleoak/core` exports `buildAuthorityGraph`, `authorityGraphDigestPayload`, `verifyAuthorityGraphDigest`, `queryAuthorityGraph`, and `explainAuthorityGraph`. Authority Graph is a derived explanatory view and has no authority-issuing side effects. See [Authority Graph](authority-graph.md).


## Approval Contract

`@ruleoak/core` exports `buildApprovalRequest`, `verifyApprovalRequest`, `buildApprovalResult`, `signApprovalResult`, `verifyApprovalResult`, `applyApprovalResult`, `consumeApprovalResultForLease`, and `issueExecutionLease`. Approval-bound lease issuance requires the persisted one-time approval-use store. See `docs/concepts/APPROVAL_CONTRACT.md`.


## Evidence Graph

`@ruleoak/protocol` exports `EvidenceGraph`, `EvidenceGraphNode`, `EvidenceGraphEdge`, `EvidenceGraphUnresolvedReference`, `EVIDENCE_GRAPH_VERSIONS`, `EVIDENCE_GRAPH_NODE_KINDS`, and `validateEvidenceGraph`.

`@ruleoak/core` exports `buildEvidenceGraph`, `evidenceGraphDigestPayload`, `verifyEvidenceGraphDigest`, `queryEvidenceTimeline`, and `traceEvidenceGraph`.

Evidence Graph is a derived read-only view. It requires a semantic-digest-valid Authority Graph and a complete Flight Recorder event sequence whose hash chain verifies. It adds recorder-event and adapter identity nodes, preserves existing effect status/observation-quality values, and records missing evidence as unresolved references.

## Evidence Bundle & Sink

`@ruleoak/protocol` exports `EvidenceBundleManifest`, `EvidencePrivacyProfile`, `EvidenceBundleFileRole`, `EVIDENCE_BUNDLE_VERSIONS`, `EVIDENCE_PRIVACY_PROFILES`, `EVIDENCE_BUNDLE_FILE_ROLES`, and `validateEvidenceBundleManifest`.

`@ruleoak/core` exports `EVIDENCE_SINK_SPI_VERSION`, `validateEvidenceSinkDescriptor`, `EvidenceSinkRegistry`, and `LocalFileEvidenceSink`. Sink delivery occurs after local bundle creation and is not an authority/approval/execution path. Each sink receives an isolated bundle-byte copy.

The CLI creates Evidence Bundle Manifest v3 with `ruleoak audit bundle --profile minimal|operational|forensic_local` and verifies v3 plus historical v2 bundles with `ruleoak audit verify-bundle`. See [Evidence Bundle v3](evidence-bundle.md) and [Evidence Bundle & Sink](reference/EVIDENCE_BUNDLE_SINK.md).
