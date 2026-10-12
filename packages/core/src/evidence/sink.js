/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { mkdirSync } from 'node:fs';
import { atomicWriteFileSync } from '../io/durable-file.js';
import { dirname, resolve } from 'node:path';
import { validateEvidenceBundleManifest } from '@ruleoak/protocol';

export const EVIDENCE_SINK_SPI_VERSION='1.0';
export const EVIDENCE_SINK_NETWORK_MODES=Object.freeze(['none','optional','required']);

function clone(value){return value===undefined?undefined:structuredClone(value);}
function safeId(value){return typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);}

export function validateEvidenceSinkDescriptor(descriptor){
  const errors=[];
  if(!descriptor||typeof descriptor!=='object'||Array.isArray(descriptor))errors.push('evidence sink descriptor must be an object');
  else{
    if(descriptor.sink_spi_version!==EVIDENCE_SINK_SPI_VERSION)errors.push('sink_spi_version must be 1.0');
    if(!safeId(descriptor.sink_id))errors.push('sink_id is invalid');
    if(!EVIDENCE_SINK_NETWORK_MODES.includes(descriptor.network))errors.push('network is invalid');
    if(!Array.isArray(descriptor.accepted_profiles)||descriptor.accepted_profiles.length===0)errors.push('accepted_profiles must be a non-empty array');
    else {const seen=new Set();for(const p of descriptor.accepted_profiles){if(!['minimal','operational','forensic_local'].includes(p))errors.push(`accepted_profiles contains invalid profile: ${p}`);if(seen.has(p))errors.push(`accepted_profiles contains duplicate profile: ${p}`);seen.add(p);}}
    if(descriptor.description!==undefined&&(typeof descriptor.description!=='string'||descriptor.description.length>512))errors.push('description is invalid');
  }
  return{valid:errors.length===0,errors};
}

export class EvidenceSinkRegistry{
  constructor(){this.sinks=new Map();}
  register(sink){
    const descriptor=sink?.descriptor;const validation=validateEvidenceSinkDescriptor(descriptor);
    if(!validation.valid)throw new Error(`invalid evidence sink: ${validation.errors.join('; ')}`);
    if(!sink?.implementation||typeof sink.implementation.write!=='function')throw new Error('evidence sink implementation requires write()');
    if(this.sinks.has(descriptor.sink_id))throw new Error(`duplicate evidence sink: ${descriptor.sink_id}`);
    this.sinks.set(descriptor.sink_id,{descriptor:clone(descriptor),implementation:sink.implementation});
    return clone(descriptor);
  }
  list(){return [...this.sinks.values()].map(x=>clone(x.descriptor));}
  async deliver(bundle,context={}){
    if(!Buffer.isBuffer(bundle?.bytes))throw new Error('evidence bundle bytes must be a Buffer');
    const manifestValidation=validateEvidenceBundleManifest(bundle?.manifest);if(!manifestValidation.valid)throw new Error(`invalid evidence bundle manifest: ${manifestValidation.errors.join('; ')}`);
    const results=[];
    for(const entry of this.sinks.values()){
      const id=entry.descriptor.sink_id;
      if(!entry.descriptor.accepted_profiles.includes(bundle?.manifest?.privacy_profile)){
        results.push({sink_id:id,ok:false,error:'privacy profile is not accepted by sink'});continue;
      }
      try{
        const response=await entry.implementation.write({bytes:Buffer.from(bundle.bytes),manifest:clone(bundle.manifest)},clone(context));
        results.push({sink_id:id,ok:true,response:clone(response)});
      }catch(error){
        results.push({sink_id:id,ok:false,error:String(error?.message||error)});
      }
    }
    return results;
  }
}

export class LocalFileEvidenceSink{
  constructor(directory,id='local-file-evidence-sink'){
    if(typeof directory!=='string'||!directory)throw new Error('local evidence sink directory is required');
    this.directory=resolve(directory);
    this.descriptor={sink_spi_version:'1.0',sink_id:id,network:'none',accepted_profiles:['minimal','operational','forensic_local'],description:'Writes an already-created RuleOak evidence bundle to a local directory.'};
  }
  write({bytes,manifest}){
    if(!Buffer.isBuffer(bytes))throw new Error('evidence sink bytes must be a Buffer');
    const name=`ruleoak-evidence-${String(manifest.bundle_id).replace(':','-')}.zip`;
    const path=resolve(this.directory,name);
    mkdirSync(dirname(path),{recursive:true,mode:0o700});
    atomicWriteFileSync(path,bytes,{mode:0o600,maxBytes:256*1024*1024,label:'evidence bundle'});
    return{path,bundle_id:manifest.bundle_id,bytes:bytes.length};
  }
  asSink(){return{descriptor:this.descriptor,implementation:this};}
}
