/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import{resolve}from'node:path';import{buildMcpRegistryInspectionQueue,diffMcpRegistrySnapshots,fetchOfficialMcpRegistrySnapshot}from'@ruleoak/core';import{atomicWriteFileSync,readBoundedFileSync}from'./io/durable-file.js';
const MAX_REGISTRY_SNAPSHOT_BYTES=8*1024*1024;
function writeJson(path,value){const p=resolve(path);atomicWriteFileSync(p,JSON.stringify(value,null,2)+'\n',{mode:0o600,maxBytes:MAX_REGISTRY_SNAPSHOT_BYTES,label:'MCP Registry snapshot'});return p}
function readJson(path){return JSON.parse(readBoundedFileSync(resolve(path),{maxBytes:MAX_REGISTRY_SNAPSHOT_BYTES,label:'MCP Registry snapshot'}));}
export async function fetchRegistrySnapshotToFile(path,options={}){const snapshot=await fetchOfficialMcpRegistrySnapshot(options);return {snapshot,path:writeJson(path,snapshot)}}
export function buildRegistryQueueFile(snapshotPath,outPath,options={}){const snapshot=readJson(snapshotPath);const queue=buildMcpRegistryInspectionQueue(snapshot,options);return {queue,path:writeJson(outPath,queue)}}
export function diffRegistrySnapshotFiles(previousPath,currentPath){return diffMcpRegistrySnapshots(readJson(previousPath),readJson(currentPath))}
