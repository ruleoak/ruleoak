/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { validateExtensionDescriptor, validatePolicy } from '@ruleoak/protocol';
import { validateCrashScenario } from '../crashlab/index.js';
export const RULEOAK_EXTENSION_SPI_VERSION='1.0';
const METHOD_BY_KIND=Object.freeze({organization_policy:'getPolicy',approval:'request',event_sink:'emit',inspector_intelligence:'enrich',crashlab_scenario:'listScenarios'});
const FORBIDDEN_INTELLIGENCE_KEYS=new Set(['decision','effect','allow','deny','policy','execution_lease','authority_envelope']);
export function validateRuleOakExtension(extension){
  const errors=[];const descriptor=extension?.descriptor;const dv=validateExtensionDescriptor(descriptor);if(!dv.valid)errors.push(...dv.errors);
  const impl=extension?.implementation;if(!impl||typeof impl!=='object')errors.push('implementation must be an object');
  else if(descriptor?.kind){const method=METHOD_BY_KIND[descriptor.kind];if(method&&typeof impl[method]!=='function')errors.push(`${descriptor.kind} implementation requires ${method}()`);if(descriptor.kind==='crashlab_scenario'&&impl.loadScenario!==undefined&&typeof impl.loadScenario!=='function')errors.push('crashlab_scenario loadScenario must be a function when present');}
  return{valid:errors.length===0,errors};
}
function clone(v){return v===undefined?undefined:structuredClone(v);}
function validateIntelligenceResult(value){
  if(value==null)return {valid:true,errors:[]};if(typeof value!=='object'||Array.isArray(value))return{valid:false,errors:['Inspector intelligence result must be an object']};
  const errors=[];for(const key of Object.keys(value))if(FORBIDDEN_INTELLIGENCE_KEYS.has(String(key).toLowerCase()))errors.push(`Inspector intelligence may not return authority field: ${key}`);return{valid:errors.length===0,errors};
}
export class RuleOakExtensionRegistry {
  constructor(){this.extensions=new Map();}
  register(extension){const v=validateRuleOakExtension(extension);if(!v.valid)throw new Error(`invalid RuleOak extension: ${v.errors.join('; ')}`);const id=extension.descriptor.extension_id;if(this.extensions.has(id))throw new Error(`duplicate RuleOak extension: ${id}`);this.extensions.set(id,{descriptor:clone(extension.descriptor),implementation:extension.implementation});return clone(extension.descriptor);}
  list(kind=null){return [...this.extensions.values()].filter(x=>!kind||x.descriptor.kind===kind).map(x=>clone(x.descriptor));}
  get(id){const x=this.extensions.get(id);return x?{descriptor:clone(x.descriptor),implementation:x.implementation}:null;}
  async organizationPolicies(context={}){const out=[];for(const x of this.extensions.values())if(x.descriptor.kind==='organization_policy'){const policy=await x.implementation.getPolicy(clone(context));const v=validatePolicy(policy);if(!v.valid)throw new Error(`organization policy extension ${x.descriptor.extension_id} returned invalid policy: ${v.errors.join('; ')}`);out.push({extension_id:x.descriptor.extension_id,policy:clone(policy)});}return out;}
  async requestApproval(request,context={}){const providers=[...this.extensions.values()].filter(x=>x.descriptor.kind==='approval');if(providers.length!==1)throw new Error(`exactly one approval extension is required, found ${providers.length}`);const x=providers[0];return {extension_id:x.descriptor.extension_id,response:await x.implementation.request(clone(request),clone(context))};}
  async emitEvent(event,context={}){const results=[];for(const x of this.extensions.values())if(x.descriptor.kind==='event_sink')results.push({extension_id:x.descriptor.extension_id,response:await x.implementation.emit(clone(event),clone(context))});return results;}
  async enrichInspector(manifest,context={}){const enrichments=[];for(const x of this.extensions.values())if(x.descriptor.kind==='inspector_intelligence'){const value=await x.implementation.enrich(clone(manifest),clone(context));const v=validateIntelligenceResult(value);if(!v.valid)throw new Error(`Inspector intelligence extension ${x.descriptor.extension_id} violated authority boundary: ${v.errors.join('; ')}`);enrichments.push({extension_id:x.descriptor.extension_id,value:clone(value)});}return enrichments;}
  async crashlabScenarios(context={}){const out=[];for(const x of this.extensions.values())if(x.descriptor.kind==='crashlab_scenario'){const scenarios=await x.implementation.listScenarios(clone(context));if(!Array.isArray(scenarios))throw new Error(`CrashLab extension ${x.descriptor.extension_id} must return an array`);for(const scenario of scenarios){const v=validateCrashScenario(scenario);if(!v.valid)throw new Error(`CrashLab extension ${x.descriptor.extension_id} returned invalid scenario: ${v.errors.join('; ')}`);out.push({extension_id:x.descriptor.extension_id,scenario:clone(scenario)});}}return out;}
}
export class MemoryEventSink {constructor(id='memory-event-sink'){this.descriptor={spi_version:'1.0',extension_id:id,kind:'event_sink',data_access:['effect_metadata'],network:'none'};this.events=[];}emit(event){this.events.push(clone(event));return{accepted:true,count:this.events.length};}asExtension(){return{descriptor:this.descriptor,implementation:this};}}
export class StaticOrganizationPolicyProvider {constructor(policy,id='static-org-policy'){this.policy=clone(policy);this.descriptor={spi_version:'1.0',extension_id:id,kind:'organization_policy',data_access:['authority_metadata'],network:'none'};}getPolicy(){return clone(this.policy);}asExtension(){return{descriptor:this.descriptor,implementation:this};}}
