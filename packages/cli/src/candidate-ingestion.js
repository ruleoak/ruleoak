/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {constants,openSync,closeSync,fstatSync,readSync,readFileSync,lstatSync,readdirSync,mkdirSync,writeFileSync,mkdtempSync,rmSync,chmodSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
export const CANDIDATE_LIMITS=Object.freeze({archiveBytes:64*1024*1024,totalBytes:256*1024*1024,fileBytes:8*1024*1024,entries:50000,ratio:200,depth:32,pathBytes:1024});
const sha=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const limitsFor=options=>{
 const result={...CANDIDATE_LIMITS};
 for(const [k,v] of Object.entries(options||{})) {
  if(!(k in result)||!Number.isSafeInteger(v)||v<1||v>result[k])throw Error('candidate limits may only be tightened: '+k);
  result[k]=v;
 }
 return result;
};
export function readBoundedCandidateFile(path,maxBytes=CANDIDATE_LIMITS.fileBytes) {
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try {const before=fstatSync(fd);if(!before.isFile()||before.size>maxBytes)throw Error('candidate file exceeds limit or is not regular: '+path);
  const buffer=Buffer.alloc(before.size+1);let length=0,n;while(length<buffer.length&&(n=readSync(fd,buffer,length,buffer.length-length,null))>0)length+=n;const bytes=buffer.subarray(0,length),after=fstatSync(fd);
  if(bytes.length!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs||after.ctimeMs!==before.ctimeMs)throw Error('candidate changed while reading: '+path);
  return bytes;
 } finally {closeSync(fd);}
}
function safePath(raw,limits,directory=false) {
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>limits.pathBytes||/[\\\x00-\x1f\x7f:]/.test(raw)||raw.startsWith('/')||raw.normalize('NFC')!==raw)throw Error('unsafe or ambiguous candidate path: '+JSON.stringify(raw));
 const p=directory?raw.replace(/\/$/,''):raw,parts=p.split('/');
 if(parts.length>limits.depth||parts.some(x=>!x||x==='.'||x==='..'||/[. ]$/.test(x)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(x)))throw Error('unsafe candidate path: '+raw);
 return p;
}
/** Inspect all metadata before reading any source file. Ignored runtime trees are excluded explicitly by the caller. */
export function scanCandidateTree(root,options={}) {
 const limits=limitsFor(options.limits),files=[],seen=new Map();let total=0,count=0;
 const rootStat=lstatSync(root);if(rootStat.isSymbolicLink()||!rootStat.isDirectory())throw Error('candidate root must be a real directory');
 function visit(dir,rel='') {
  for(const name of readdirSync(dir).sort()) {
   const path=rel?rel+'/'+name:name;
   if(options.ignore?.(path))continue;
   const abs=join(dir,name),st=lstatSync(abs);safePath(path,limits);
   if(++count>limits.entries)throw Error('candidate entry limit exceeded');
   const key=path.toLowerCase();if(seen.has(key))throw Error('case-ambiguous candidate paths');seen.set(key,path);
   if(st.isSymbolicLink()||(!st.isFile()&&!st.isDirectory()))throw Error('candidate entry must be regular file/directory: '+path);
   if(st.isDirectory()){visit(abs,path);continue;}
   if(st.size>limits.fileBytes||(total+=st.size)>limits.totalBytes)throw Error('candidate expanded byte limit exceeded: '+path);
   files.push({path,abs,size:st.size,mode:st.mode&0o777});
  }
 }
 visit(root);
 const result=new Map();
 for(const f of files){const bytes=readBoundedCandidateFile(f.abs,limits.fileBytes);if(bytes.length!==f.size)throw Error('candidate size changed after preflight');result.set(f.path,{...f,hash:sha(bytes)});}
 return result;
}
export function candidateTreeDigest(tree) {return sha(JSON.stringify([...tree].map(([path,f])=>[path,f.hash,f.size,f.mode]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)));}
const crcTable=Uint32Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=(i&1)?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
const crc32=b=>{let c=0xffffffff;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
function extras(buffer,start,size) {
 const end=start+size;if(end>buffer.length)throw Error('truncated ZIP extra');
 while(start<end){if(start+4>end)throw Error('truncated ZIP extra');const id=buffer.readUInt16LE(start),n=buffer.readUInt16LE(start+2);start+=4;if(start+n>end)throw Error('invalid ZIP extra');if([1,0x7075].includes(id))throw Error('unsupported ZIP64 or Unicode path override');start+=n;}
}
/** Validate central AND local records; no extraction occurs in this function. ZIP64/encryption are deliberately unsupported. */
export function preflightCandidateZip(bytes,options={}) {
 const limits=limitsFor(options);if(!Buffer.isBuffer(bytes)||bytes.length<22||bytes.length>limits.archiveBytes)throw Error('candidate archive byte limit or format');
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50&&i+22+bytes.readUInt16LE(i+20)===bytes.length){end=i;break;}
 if(end<0)throw Error('ZIP end record missing');
 const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16);
 if(bytes.readUInt16LE(end+4)||bytes.readUInt16LE(end+6)||bytes.readUInt16LE(end+8)!==count||count===0xffff||size===0xffffffff||offset===0xffffffff)throw Error('multi-disk or ZIP64 unsupported');
 if(!count||count>limits.entries||offset+size!==end)throw Error('ZIP entry limit or central-directory bounds');
 let pos=offset,total=0;const entries=[],seen=new Map(),ranges=[];
 for(let i=0;i<count;i++) {
  if(pos+46>end||bytes.readUInt32LE(pos)!==0x02014b50)throw Error('invalid ZIP central record');
  const flags=bytes.readUInt16LE(pos+8),method=bytes.readUInt16LE(pos+10),crc=bytes.readUInt32LE(pos+16),compressed=bytes.readUInt32LE(pos+20),expanded=bytes.readUInt32LE(pos+24);
  const n=bytes.readUInt16LE(pos+28),x=bytes.readUInt16LE(pos+30),comment=bytes.readUInt16LE(pos+32),local=bytes.readUInt32LE(pos+42),attributes=bytes.readUInt32LE(pos+38),host=bytes[pos+5];
  if(bytes.readUInt16LE(pos+34)||[compressed,expanded,local].includes(0xffffffff)||flags&~0x080e||!([0,8].includes(method))||(method===0&&(flags&6)))throw Error('unsupported ZIP flags, compression or disk');
  if(pos+46+n+x+comment>end||!n)throw Error('ZIP central name bounds');
  const nameBytes=bytes.subarray(pos+46,pos+46+n);
  if(!(flags&0x800)&&nameBytes.some(b=>b>127))throw Error('ambiguous ZIP filename encoding');
  let raw;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(nameBytes);}catch{throw Error('invalid UTF-8 ZIP filename');}
  const directory=raw.endsWith('/'),path=safePath(raw,limits,directory),mode=host===3?attributes>>>16:0,type=mode&0o170000;
  if(type&&type!==(directory?0o040000:0o100000)||mode&0o7000||Boolean(attributes&0x10)&&!directory)throw Error('ZIP special file or inconsistent type: '+path);
  const key=path.toLowerCase();if(seen.has(key))throw Error('duplicate or case-ambiguous ZIP path: '+path);seen.set(key,{path,directory});
  if(expanded>limits.fileBytes||(total+=expanded)>limits.totalBytes||expanded>Math.max(1,compressed)*limits.ratio)throw Error('ZIP expanded byte or compression-ratio limit: '+path);
  if(directory&&(expanded||compressed))throw Error('nonempty ZIP directory');
  extras(bytes,pos+46+n,x);
  if(local+30>offset||bytes.readUInt32LE(local)!==0x04034b50)throw Error('invalid ZIP local record');
  const ln=bytes.readUInt16LE(local+26),lx=bytes.readUInt16LE(local+28),data=local+30+ln+lx;
  if(data+compressed>offset||bytes.readUInt16LE(local+6)!==flags||bytes.readUInt16LE(local+8)!==method||!bytes.subarray(local+30,local+30+ln).equals(nameBytes))throw Error('ZIP local/central mismatch');
  extras(bytes,local+30+ln,lx);
  let finish=data+compressed;
  if(flags&8) {
   if(finish+12>offset)throw Error('ZIP data descriptor missing');
   if(bytes.readUInt32LE(finish)===0x08074b50)finish+=4;
   if(finish+12>offset||bytes.readUInt32LE(finish)!==crc||bytes.readUInt32LE(finish+4)!==compressed||bytes.readUInt32LE(finish+8)!==expanded)throw Error('ZIP descriptor mismatch');
   finish+=12;
  } else if(bytes.readUInt32LE(local+14)!==crc||bytes.readUInt32LE(local+18)!==compressed||bytes.readUInt32LE(local+22)!==expanded)throw Error('ZIP size/CRC metadata mismatch');
  ranges.push([local,finish]);entries.push({path,directory,mode:mode&0o111?0o755:0o644,method,crc,compressed,expanded,data});pos+=46+n+x+comment;
 }
 if(pos!==end)throw Error('ZIP central size/count mismatch');
 ranges.sort((a,b)=>a[0]-b[0]);let previous=0;
 for(const [start,finish] of ranges){if(start!==previous)throw Error('ZIP overlapping records or unaccounted bytes');previous=finish;}
 if(previous!==offset)throw Error('ZIP unaccounted local bytes');
 const prefixCases=new Map();
 for(const e of entries){const parts=e.path.split('/');for(let i=1;i<=parts.length;i++){const prefix=parts.slice(0,i).join('/'),key=prefix.toLowerCase();if(prefixCases.has(key)&&prefixCases.get(key)!==prefix)throw Error('ZIP implicit directory case collision');prefixCases.set(key,prefix);}for(let i=1;i<parts.length;i++){const parent=parts.slice(0,i).join('/'),row=seen.get(parent.toLowerCase());if(row&&(!row.directory||row.path!==parent))throw Error('ZIP file/directory or case collision');}}
 return {entries,totalExpandedBytes:total,archiveBytes:bytes.length,limits};
}
export function extractCandidateZip(path,options={}) {
 const limits=limitsFor(options),bytes=readBoundedCandidateFile(path,limits.archiveBytes),inspection=preflightCandidateZip(bytes,limits);
 const temp=mkdtempSync(join(tmpdir(),'ruleoak-candidate-'));
 try {
  for(const e of inspection.entries){const dest=join(temp,e.path);if(e.directory){mkdirSync(dest,{recursive:true});continue;}
   const compressed=bytes.subarray(e.data,e.data+e.compressed),data=e.method===0?compressed:inflateRawSync(compressed,{maxOutputLength:Math.max(1,e.expanded)});
   if(data.length!==e.expanded||crc32(data)!==e.crc)throw Error('ZIP expanded size or CRC mismatch: '+e.path);
   mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data,{flag:'wx',mode:e.mode});chmodSync(dest,e.mode);
  }
  const names=readdirSync(temp).filter(x=>x!=='.DS_Store'),root=names.length===1&&lstatSync(join(temp,names[0])).isDirectory()?join(temp,names[0]):temp;
  // Retain ingested bytes in memory so a swapped input path cannot alter handoff.
  return {root,source_type:'zip',source_path:resolve(path),source_zip:resolve(path),source_sha256:sha(bytes),archive_bytes:bytes,preflight:{entry_count:inspection.entries.length,expanded_bytes:inspection.totalExpandedBytes},cleanup:()=>rmSync(temp,{recursive:true,force:true})};
 } catch(error){rmSync(temp,{recursive:true,force:true});throw error;}
}
