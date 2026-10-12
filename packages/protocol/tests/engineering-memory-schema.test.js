/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { ENGINEERING_MEMORY_RECORD_TYPES,validateEngineeringMemoryBundle } from '../src/engineering-memory.js';
const records=ENGINEERING_MEMORY_RECORD_TYPES.map((type,i)=>({id:`memory.${i}`,type,statement:`${type} record`,status:type==='Regression'?'historical':'active',capability_ids:['cap.example'],related_record_ids:[],provenance:{class:'DECLARED',method:'test-fixture',source:'protocol-test',confidence:1}}));
const bundle={engineering_memory_version:'0.1',bundle_id:'memory.example',records};assert.equal(validateEngineeringMemoryBundle(bundle).valid,true);assert.equal(validateEngineeringMemoryBundle({...bundle,engineering_memory_version:'9.9'}).valid,false);assert.equal(validateEngineeringMemoryBundle({...bundle,records:[...records,{...records[0]}]}).valid,false);console.log('Engineering Memory protocol tests passed');
