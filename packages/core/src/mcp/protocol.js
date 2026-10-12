/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
export const MCP_PROTOCOL_2026_07_28='2026-07-28';
export const MCP_PROTOCOL_2025_06_18='2025-06-18';
export const SUPPORTED_MCP_PROTOCOLS=Object.freeze([MCP_PROTOCOL_2026_07_28,MCP_PROTOCOL_2025_06_18]);
function lowerHeaders(headers={}){return Object.fromEntries(Object.entries(headers||{}).map(([k,v])=>[String(k).toLowerCase(),Array.isArray(v)?v[0]:v]));}
export function inspectMcpRequest({headers={},body={}}={}){
  const h=lowerHeaders(headers);const version=String(h['mcp-protocol-version']||body?.protocolVersion||body?.protocol_version||MCP_PROTOCOL_2025_06_18);const errors=[];const warnings=[];
  if(!SUPPORTED_MCP_PROTOCOLS.includes(version))errors.push(`unsupported MCP protocol version: ${version}`);
  const generation=version===MCP_PROTOCOL_2026_07_28?'2026-stateless':'2025-session-compatible';
  if(version===MCP_PROTOCOL_2026_07_28){
    const methodHeader=h['mcp-method'];const nameHeader=h['mcp-name'];
    if(methodHeader&&body?.method&&String(methodHeader)!==String(body.method))errors.push('Mcp-Method header/body mismatch');
    if(body?.method==='tools/call'&&nameHeader&&body?.params?.name&&String(nameHeader)!==String(body.params.name))errors.push('Mcp-Name header/body mismatch');
    if(body?.method==='initialize'||body?.method==='notifications/initialized')warnings.push('legacy initialization method observed on 2026 stateless path');
  }
  return{ok:errors.length===0,errors,warnings,version,generation,method:body?.method||h['mcp-method']||null,name:body?.params?.name||h['mcp-name']||null,stateless:generation==='2026-stateless'};
}
