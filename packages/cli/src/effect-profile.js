/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { existsSync, realpathSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const REFERENCE_FILESYSTEM_PACKAGE='@modelcontextprotocol/server-filesystem';
const DIRECT_FILESYSTEM_COMMANDS=new Set(['mcp-server-filesystem','server-filesystem']);
const PACKAGE_RUNNERS=new Set(['npx','npx.cmd','npm','npm.cmd','pnpm','pnpm.cmd','yarn','yarn.cmd','bunx']);

function normalizeRoots(values=[],cwd=process.cwd()){
  const roots=[];
  for(const raw of values){
    if(typeof raw!=='string'||!raw.trim()||raw.startsWith('-'))continue;
    const abs=resolve(cwd,raw);
    try{
      if(!existsSync(abs)||!statSync(abs).isDirectory())continue;
      const real=realpathSync.native?realpathSync.native(abs):realpathSync(abs);
      if(!roots.includes(real))roots.push(real);
    }catch{/* unsupported root is omitted fail-closed */}
  }
  return roots;
}

function rootsAfterToken(args,token,cwd){
  const index=args.findIndex(v=>String(v)===token);
  if(index<0)return[];
  return normalizeRoots(args.slice(index+1),cwd);
}

/**
 * Resolve the only automatic stdio effect profile RuleOak currently trusts:
 * the reference local MCP filesystem server, scoped to its existing configured
 * roots. Custom servers must opt in explicitly with reviewed roots.
 */
export function resolveStdioEffectProfile(command,args=[],options={}){
  const cwd=resolve(options.cwd||process.cwd());
  const explicit=options.explicitProfile;
  if(explicit){
    const kind=typeof explicit==='string'?explicit:explicit.kind;
    const roots=normalizeRoots(options.effectRoots||explicit.roots||[],cwd);
    if(kind!=='local-filesystem'||roots.length===0)return null;
    return{profile_version:'1.0',profile_id:'local-filesystem-explicit-v1',kind:'local-filesystem',roots,provenance:'explicit-reviewed-route',confidence:'explicit'};
  }

  const argv=Array.isArray(args)?args.map(String):[];
  const rawCommand=String(command||'').trim(),cmdBase=basename(rawCommand).toLowerCase(),bareCommand=(rawCommand===basename(rawCommand))?cmdBase:null;
  let roots=[];
  if(bareCommand&&PACKAGE_RUNNERS.has(bareCommand)) roots=rootsAfterToken(argv,REFERENCE_FILESYSTEM_PACKAGE,cwd);
  if(!roots.length&&bareCommand&&DIRECT_FILESYSTEM_COMMANDS.has(bareCommand)) roots=normalizeRoots(argv,cwd);
  if(!roots.length)return null;
  return{profile_version:'1.0',profile_id:'mcp-reference-local-filesystem-v1',kind:'local-filesystem',roots,provenance:'recognized-reference-server',confidence:'strong'};
}

export function publicEffectProfile(profile){
  if(!profile)return null;
  return{profile_version:profile.profile_version,profile_id:profile.profile_id,kind:profile.kind,root_count:Array.isArray(profile.roots)?profile.roots.length:0,provenance:profile.provenance,confidence:profile.confidence};
}
