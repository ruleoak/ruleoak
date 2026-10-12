/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import * as protocol from '@ruleoak/protocol';
import { isAuthorityGrantAttenuated } from '../../src/index.js';
export const implementation_id='ruleoak-reference';
export const implementation_version='0.50.0';
export function canonicalize(value){return protocol.canonicalProtocolJson(value);}
export function validate(contractId,input){
  switch(contractId){
    case 'capability_identity_evidence': return {valid:protocol.validateCapabilityIdentity(input?.identity).valid&&protocol.validateCapabilityEvidence(input?.evidence).valid};
    case 'authority_grant': return protocol.validateAuthorityGrant(input);
    case 'authority_envelope': return protocol.validateAuthorityEnvelope(input);
    case 'delegation': {const p=protocol.validateAuthorityGrant(input?.parent),c=protocol.validateAuthorityGrant(input?.child);return {valid:p.valid&&c.valid&&isAuthorityGrantAttenuated(input.parent,input.child).ok};}
    case 'revocation': return protocol.validateRevocationRecord(input);
    case 'approval_result': return protocol.validateApprovalResult(input);
    case 'execution_lease': return protocol.validateExecutionLease(input);
    case 'effect_receipt': return protocol.validateEffectReceipt(input);
    case 'evidence_bundle': return protocol.validateEvidenceBundleManifest(input);
    case 'adapter_descriptor': return protocol.validateAdapterDescriptor(input);
    case 'crashlab_scenario': return protocol.validateCrashLabScenario(input);
    default: return {valid:false,errors:[`unsupported contract: ${contractId}`]};
  }
}
