/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';

const DEFAULT_MAX_HASH_BYTES = 16 * 1024 * 1024;
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

function sha256(value) { return `sha256:${createHash('sha256').update(value).digest('hex')}`; }
function toolToken(value='') {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[.:/\\-]+/)
    .filter(Boolean)
    .at(-1) || '';
}
function normalizeOperation(name='') {
  const token=toolToken(name);
  if (/^(write|write_file|create_file|put_file|save_file)$/.test(token)) return 'write';
  if (/^(edit|edit_file|patch_file|update_file)$/.test(token)) return 'edit';
  if (/^(create_directory|mkdir|make_directory)$/.test(token)) return 'create_directory';
  if (/^(move_file|move|rename|rename_file)$/.test(token)) return 'move';
  if (/^(delete_file|remove_file|unlink|delete|remove)$/.test(token)) return 'delete';
  if (/^(delete_directory|remove_directory|rmdir)$/.test(token)) return 'delete';
  return token;
}

export function captureFilesystemState(path, options={}) {
  const target=typeof path==='string'&&path?path:null;
  if(!target) return {present:false,kind:'unknown',capture_error:'path_required'};
  if(!existsSync(target)) return {present:false,kind:'absent'};
  try {
    const link=lstatSync(target);
    if(link.isSymbolicLink()) return {present:true,kind:'symlink',size:link.size,verification_unsupported_reason:'symlink_target_not_auto_verified'};
    const stat=statSync(target);
    const kind=stat.isFile()?'file':stat.isDirectory()?'directory':'other';
    const out={present:true,kind,size:stat.size};
    const maxHashBytes=Math.max(0,Number(options.maxHashBytes??DEFAULT_MAX_HASH_BYTES));
    if(kind==='file'&&stat.size<=maxHashBytes) out.digest=sha256(readFileSync(target));
    else if(kind==='file') out.digest_unavailable_reason=`file_exceeds_${maxHashBytes}_bytes`;
    return out;
  } catch(error) {
    return {present:true,kind:'unknown',capture_error:String(error?.message||error).slice(0,512)};
  }
}


function canonicalPotentialPath(value) {
  const absolute=resolve(String(value));
  let probe=absolute;
  while(!existsSync(probe)){const parent=dirname(probe);if(parent===probe)return null;probe=parent;}
  try{
    const real=realpathSync.native?realpathSync.native(probe):realpathSync(probe);
    return resolve(real,relative(probe,absolute));
  }catch{return null;}
}
function pathWithin(root,target){const r=relative(resolve(root),resolve(target));return r===''||(r!=='..'&&!r.startsWith(`..${sep}`)&&!isAbsolute(r));}
function pathGuard(path,allowedRoots){
  if(!Array.isArray(allowedRoots))return null;
  const target=canonicalPotentialPath(path);if(!target)return {ok:false,reason:'target_path_cannot_be_canonicalized'};
  const roots=[];
  for(const root of allowedRoots){
    try{const real=realpathSync.native?realpathSync.native(resolve(String(root))):realpathSync(resolve(String(root)));if(statSync(real).isDirectory())roots.push(real);}catch{}
  }
  const matched=roots.find(root=>pathWithin(root,target));
  return matched?{ok:true,canonical_path:target,allowed_root:matched}:{ok:false,reason:'target_outside_reviewed_effect_roots',canonical_path:target};
}

function exactEditResult(beforeText, edits) {
  if(typeof beforeText!=='string'||!Array.isArray(edits)||edits.length===0) return null;
  let value=beforeText;
  for(const edit of edits) {
    if(!edit||typeof edit.oldText!=='string'||typeof edit.newText!=='string'||edit.oldText==='') return null;
    const first=value.indexOf(edit.oldText);
    if(first<0||value.indexOf(edit.oldText,first+edit.oldText.length)>=0) return null;
    value=value.slice(0,first)+edit.newText+value.slice(first+edit.oldText.length);
  }
  return value;
}

/**
 * Infer a bounded, serializable postcondition contract from common local filesystem
 * tool-call shapes. Inference is deliberately conservative: unsupported/ambiguous
 * shapes return null rather than inventing effect certainty.
 */
export function inferFilesystemEffectContract(input={}, options={}) {
  const operation=normalizeOperation(input.operation||input.name||input.tool||'');
  const path=input.path||input.target||null;
  const maxHashBytes=Math.max(1024,Number(options.maxHashBytes??DEFAULT_MAX_HASH_BYTES));
  const base={effect_contract_version:'1.1',kind:'filesystem',operation,inference:'bounded_local_filesystem',retry_safe:false};
  const allowedRoots=Array.isArray(options.allowedRoots)?options.allowedRoots:null;
  const guardFor=(value)=>allowedRoots?pathGuard(value,allowedRoots):null;

  if(operation==='write'&&path) {
    const pathGuardResult=guardFor(path);if(pathGuardResult&&!pathGuardResult.ok)return null;
    let content=input.content;
    if(content===undefined&&typeof input.content_base64==='string') {
      try { content=Buffer.from(input.content_base64,'base64'); } catch { return null; }
    }
    if(content===undefined) return null;
    const bytes=Buffer.isBuffer(content)?content:Buffer.from(String(content));
    if(bytes.length>maxHashBytes) return null;
    const before=captureFilesystemState(path,{maxHashBytes});
    if(before.kind==='symlink') return null;
    return {...base,operation:'write',confidence:'exact',path_guard:pathGuardResult||null,verifier_spec:{kind:'filesystem',operation:'write',path,expected:{sha256:sha256(bytes),before,canonical_path:pathGuardResult?.canonical_path||null,allowed_root:pathGuardResult?.allowed_root||null},idempotent:input.idempotent===true||input.retry_safe===true}};
  }

  if(operation==='create_directory'&&path) {
    const pathGuardResult=guardFor(path);if(pathGuardResult&&!pathGuardResult.ok)return null;
    const before=captureFilesystemState(path,{maxHashBytes});
    if(before.kind==='symlink') return null;
    return {...base,operation:'create_directory',confidence:'exact',retry_safe:true,path_guard:pathGuardResult||null,verifier_spec:{kind:'filesystem',operation:'create_directory',path,expected:{kind:'directory',before,canonical_path:pathGuardResult?.canonical_path||null,allowed_root:pathGuardResult?.allowed_root||null},idempotent:true}};
  }

  if(operation==='delete'&&path) {
    const pathGuardResult=guardFor(path);if(pathGuardResult&&!pathGuardResult.ok)return null;
    const before=captureFilesystemState(path,{maxHashBytes});
    if(before.kind==='symlink') return null;
    return {...base,operation:'delete',confidence:'exact',path_guard:pathGuardResult||null,verifier_spec:{kind:'filesystem',operation:'delete',path,expected:{absent:true,before,canonical_path:pathGuardResult?.canonical_path||null,allowed_root:pathGuardResult?.allowed_root||null},idempotent:false}};
  }

  if(operation==='move') {
    const source=input.source||input.from||input.path||null;
    const destination=input.destination||input.to||input.target||null;
    if(!source||!destination||source===destination) return null;
    const sourceGuard=guardFor(source),destinationGuard=guardFor(destination);if((sourceGuard&&!sourceGuard.ok)||(destinationGuard&&!destinationGuard.ok))return null;
    const sourceBefore=captureFilesystemState(source,{maxHashBytes});
    const destinationBefore=captureFilesystemState(destination,{maxHashBytes});
    if(sourceBefore.kind==='symlink'||destinationBefore.kind==='symlink') return null;
    return {...base,operation:'move',confidence:sourceBefore.present?'exact_or_bounded':'bounded',path_guard:{source:sourceGuard||null,destination:destinationGuard||null},verifier_spec:{kind:'filesystem',operation:'move',source,destination,expected:{source_before:sourceBefore,destination_before:destinationBefore,source_canonical_path:sourceGuard?.canonical_path||null,destination_canonical_path:destinationGuard?.canonical_path||null,source_allowed_root:sourceGuard?.allowed_root||null,destination_allowed_root:destinationGuard?.allowed_root||null},idempotent:false}};
  }

  if(operation==='edit'&&path&&input.dryRun!==true&&input.dry_run!==true) {
    const pathGuardResult=guardFor(path);if(pathGuardResult&&!pathGuardResult.ok)return null;
    const before=captureFilesystemState(path,{maxHashBytes});
    if(!before.present||before.kind!=='file'||!before.digest) return null;
    let text;
    try { text=readFileSync(path,'utf8'); } catch { return null; }
    if(Buffer.byteLength(text)>maxHashBytes) return null;
    const after=exactEditResult(text,input.edits);
    if(after===null) return null;
    return {...base,operation:'edit',confidence:'exact_unique_edits',path_guard:pathGuardResult||null,verifier_spec:{kind:'filesystem',operation:'edit',path,expected:{sha256:sha256(Buffer.from(after)),before,canonical_path:pathGuardResult?.canonical_path||null,allowed_root:pathGuardResult?.allowed_root||null},idempotent:false}};
  }
  return null;
}

export function inferMcpEffectContract(item={}, options={}) {
  const name=String(item?.params?.name||item?.params?.tool||'');
  const args=item?.params?.arguments&&typeof item.params.arguments==='object'&&!Array.isArray(item.params.arguments)?item.params.arguments:{};
  const token=toolToken(name);
  const looksFilesystem=/file|directory|mkdir|rename|move/.test(token)||['write','edit','delete','remove','unlink'].includes(token);
  if(!looksFilesystem) return null;
  return inferFilesystemEffectContract({name,operation:name,...args},options);
}
