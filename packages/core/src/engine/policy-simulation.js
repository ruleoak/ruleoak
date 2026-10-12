/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { validatePolicy } from '@ruleoak/protocol';
import { evaluatePermissionRequest } from '../permission/gateway.js';
import { canonicalStringify, policyDigest } from '../decision/receipt.js';

function byId(items=[]){return new Map(items.filter(Boolean).map((item,index)=>[item.id||item.decision_key||`index:${index}`,item]));}
function changedFields(before,after){const keys=new Set([...Object.keys(before||{}),...Object.keys(after||{})]);return [...keys].filter(k=>canonicalStringify(before?.[k])!==canonicalStringify(after?.[k])).sort();}
function diffRuleCollection(before=[],after=[]){const b=byId(before),a=byId(after),added=[],removed=[],modified=[];for(const [id,item] of a){if(!b.has(id))added.push(item);else{const fields=changedFields(b.get(id),item);if(fields.length)modified.push({id,fields,before:b.get(id),after:item});}}for(const [id,item] of b)if(!a.has(id))removed.push(item);return{added,removed,modified};}
export function simulatePolicy(input,policy,options={}){
  const validation=validatePolicy(policy);if(!validation.valid)return{ok:false,errors:validation.errors,policy_digest:null,decision:null,explanation:null};
  const result=evaluatePermissionRequest(input,policy,options);
  return{ok:true,errors:[],policy_digest:policyDigest(policy),decision:result.decision,classification:result.classification||null,approval:result.approval||null,explanation:{action:result.decision.action,reason:result.decision.reason,matched_rule:result.decision.matchedRule||null,matched_rules:result.decision.matchedRules||[],trace:result.decision.trace||[]}};
}
export function diffPolicies(before,after){
  const bv=validatePolicy(before),av=validatePolicy(after);const errors=[...bv.errors.map(e=>`before: ${e}`),...av.errors.map(e=>`after: ${e}`)];if(errors.length)return{ok:false,errors};
  const broad={};for(const field of ['defaultAction','allowedActions','approvalRequired','blockedActions'])if(canonicalStringify(before?.[field])!==canonicalStringify(after?.[field]))broad[field]={before:before?.[field]??null,after:after?.[field]??null};
  const exact=diffRuleCollection(before.exactActionRules||[],after.exactActionRules||[]);const structured=diffRuleCollection(before.rules||[],after.rules||[]);
  const changed=Object.keys(broad).length>0||exact.added.length||exact.removed.length||exact.modified.length||structured.added.length||structured.removed.length||structured.modified.length;
  return{ok:true,errors:[],changed,before_digest:policyDigest(before),after_digest:policyDigest(after),broad,exact_action_rules:exact,structured_rules:structured};
}
