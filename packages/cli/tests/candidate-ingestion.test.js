/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,symlinkSync,truncateSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {preflightCandidateZip,extractCandidateZip,scanCandidateTree} from '../src/candidate-ingestion.js';
const crc=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
function zip(rows){const local=[],central=[];let offset=0;for(const r of rows){const name=Buffer.from(r.name),data=Buffer.from(r.data||''),method=r.method??0,body=method===8?deflateRawSync(data):data,flags=r.flags||0,checksum=r.badCrc?1:crc(data),lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50);lh.writeUInt16LE(20,4);lh.writeUInt16LE(flags,6);lh.writeUInt16LE(method,8);lh.writeUInt16LE(name.length,26);if(!(flags&8)){lh.writeUInt32LE(checksum,14);lh.writeUInt32LE(body.length,18);lh.writeUInt32LE(data.length,22);}const descriptor=flags&8?Buffer.alloc(16):Buffer.alloc(0);if(flags&8){descriptor.writeUInt32LE(0x08074b50);descriptor.writeUInt32LE(checksum,4);descriptor.writeUInt32LE(body.length,8);descriptor.writeUInt32LE(data.length,12);}const record=Buffer.concat([lh,name,body,descriptor]);local.push(record);const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50);ch.writeUInt16LE(0x0314,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(flags,8);ch.writeUInt16LE(method,10);ch.writeUInt32LE(checksum,16);ch.writeUInt32LE(body.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(name.length,28);ch.writeUInt32LE(((r.mode??(r.name.endsWith('/')?0o040755:0o100644))<<16)>>>0,38);ch.writeUInt32LE(offset,42);central.push(ch,name);offset+=record.length;}const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(rows.length,8);end.writeUInt16LE(rows.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,cd,end]);}
let count=0;const test=(name,fn)=>{fn();count++;};const root=mkdtempSync(join(tmpdir(),'ruleoak-ingestion-tests-'));
try{
 for(const r of [{name:'root/a.js',data:'hello'},{name:'root/a.js',data:'hello',method:8},{name:'root/a.js',data:'hello',method:8,flags:8},{name:'root/文.js',data:'hello',flags:0x800}])test('valid ZIP '+count,()=>{const bytes=zip([r]);assert.equal(preflightCandidateZip(bytes).entries.length,1);const path=join(root,'valid.zip');writeFileSync(path,bytes);const candidate=extractCandidateZip(path);try{assert.equal(readFileSync(join(candidate.root,r.name.split('/').at(-1)),'utf8'),'hello');assert.equal(candidate.archive_bytes.equals(bytes),true);}finally{candidate.cleanup();}});
 for(const name of ['../escape','/absolute','C:/drive','a\\b','a/../b','a//b','a/./b','a\0b','CON','aux.txt','a.','a ','a\nb','e\u0301.js'])test('unsafe path '+count,()=>assert.throws(()=>preflightCandidateZip(zip([{name,data:'x'}]))));
 for(const rows of [[{name:'a'},{name:'a'}],[{name:'A'},{name:'a'}],[{name:'a'},{name:'a/b'}],[{name:'A/x'},{name:'a/y'}],[{name:'a/',mode:0o100644}],[{name:'a',mode:0o120777}],[{name:'a',mode:0o010644}],[{name:'a',mode:0o104755}],[{name:'a',flags:1}],[{name:'a',method:99}],[{name:'a',data:'0'.repeat(524288),method:8}]])test('archive ambiguity/bounds '+count,()=>assert.throws(()=>preflightCandidateZip(zip(rows))));
 test('entry count',()=>assert.throws(()=>preflightCandidateZip(zip([{name:'a'},{name:'b'}]),{entries:1})));
 test('aggregate bytes',()=>assert.throws(()=>preflightCandidateZip(zip([{name:'a',data:'123456'},{name:'b',data:'123456'}]),{totalBytes:10})));
 test('per-file bytes',()=>assert.throws(()=>preflightCandidateZip(zip([{name:'a',data:'123456'}]),{fileBytes:5})));
 test('archive bytes',()=>{const b=zip([{name:'a'}]);assert.throws(()=>preflightCandidateZip(b,{archiveBytes:b.length-1}));});
 test('limits cannot be relaxed',()=>assert.throws(()=>preflightCandidateZip(zip([{name:'a'}]),{ratio:201})));
 test('local name mismatch',()=>{const b=zip([{name:'a'}]);b[30]=98;assert.throws(()=>preflightCandidateZip(b));});
 test('multidisk',()=>{const b=zip([{name:'a'}]);b.writeUInt16LE(1,b.length-18);assert.throws(()=>preflightCandidateZip(b));});
 test('ZIP64 sentinel',()=>{const b=zip([{name:'a'}]);b.writeUInt32LE(0xffffffff,b.length-6);assert.throws(()=>preflightCandidateZip(b));});
 test('truncation',()=>assert.throws(()=>preflightCandidateZip(zip([{name:'a'}]).subarray(0,-1))));
 test('CRC validation and cleanup',()=>{const p=join(root,'bad.zip');writeFileSync(p,zip([{name:'a',data:'hello',badCrc:true}]));const before=readdirSync(tmpdir()).filter(p=>p.startsWith('ruleoak-candidate-')).sort();assert.throws(()=>extractCandidateZip(p),/CRC/);assert.deepEqual(readdirSync(tmpdir()).filter(p=>p.startsWith('ruleoak-candidate-')).sort(),before);});
 test('metadata bounds before source read',()=>{const dir=join(root,'sparse');mkdirSync(dir);const p=join(dir,'large');writeFileSync(p,'');truncateSync(p,9*1024*1024);assert.throws(()=>scanCandidateTree(dir),/byte limit/);});
 test('symlink rejected',()=>{const dir=join(root,'links');mkdirSync(dir);symlinkSync(root,join(dir,'link'));assert.throws(()=>scanCandidateTree(dir),/regular/);});
 test('case-ambiguous directory rejected when host filesystem can represent both names',()=>{const dir=join(root,'case');mkdirSync(dir);writeFileSync(join(dir,'A'),'a');writeFileSync(join(dir,'a'),'b');const names=readdirSync(dir);if(names.includes('A')&&names.includes('a'))assert.throws(()=>scanCandidateTree(dir),/ambiguous/);else{assert.equal(names.length,1);assert.doesNotThrow(()=>scanCandidateTree(dir));}});
 console.log(`candidate ingestion PASS: ${count} cases`);
}finally{rmSync(root,{recursive:true,force:true});}
