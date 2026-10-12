/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
import { EvidenceRecorder } from '../protocol/recorder.js';

export class RuleOakAuthorityLedger {
  constructor(recorderOrPath, options={}) { this.recorder=recorderOrPath instanceof EvidenceRecorder?recorderOrPath:new EvidenceRecorder(recorderOrPath,options); }
  append(eventType,payload={},timestamp=new Date().toISOString()) {
    const safeType=String(eventType||'unknown').replace(/[^a-z0-9_.-]/gi,'_');
    const action={type:`ruleoak.ledger.${safeType}`,target:payload.subject_id||payload.lease_id||payload.envelope_id||payload.grant_id||'ruleoak://ledger',arguments:{},metadata:{event_type:safeType}};
    const decision={action:'allow',reason:'RuleOak authority ledger event',matchedRule:'authority-ledger',ledger_event_type:safeType,ledger_payload:structuredClone(payload)};
    return this.recorder.append(action,decision,timestamp,{eventType:safeType,ledgerPayload:payload});
  }
  grantCreated(grant){return this.append('grant.created',{grant_id:grant.grant_id,subject_id:grant.subject?.id,parent_grant_id:grant.parent_grant_id||null});}
  revoked(record){return this.append('authority.revoked',record);}
  leaseIssued(lease){return this.append('lease.issued',{lease_id:lease.lease_id,decision_id:lease.decision_id,principal_id:lease.principal_id});}
  leaseConsumed(lease,marker){return this.append('lease.consumed',{lease_id:lease.lease_id,decision_id:lease.decision_id,consumed_at:marker?.consumed_at});}
  effectRecorded(effect){return this.append('effect.recorded',{effect_id:effect.effect_id,lease_id:effect.lease_id,status:effect.status,observation_quality:effect.observation_quality});}
}
