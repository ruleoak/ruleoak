/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
'use strict';
const MCP_FILE_PATTERNS = Object.freeze([
  '.mcp.json',
  'mcp.json',
  '.vscode/mcp.json',
  '.cursor/mcp.json',
  'claude_desktop_config.json'
]);
function normalizeWorkspaceRelativePath(value='') {
  return String(value).replace(/\\/g,'/').replace(/^\.\//,'');
}
function isKnownMcpConfigPath(value='') {
  const path = normalizeWorkspaceRelativePath(value).toLowerCase();
  return MCP_FILE_PATTERNS.some(pattern => path === pattern.toLowerCase() || path.endsWith('/'+pattern.toLowerCase()));
}
function inspectionArgs(file, workspace) {
  const args=['inspect','manifest',String(file),'--json'];
  if(workspace) args.push('--dir',String(workspace));
  return args;
}
function doctorArgs(workspace){return ['doctor','--dir',String(workspace),'--json'];}
function flightArgs(workspace){return ['flight','--dir',String(workspace)];}
function summarizeInspection(payload={}){
  const manifest=payload.manifest||payload; const summary=manifest.summary||{};
  return {
    integration: manifest.identity?.name || 'unknown integration',
    fingerprint: manifest.fingerprint || null,
    total: Number(summary.total||0),
    readOnly: Number(summary.read_only||0),
    stateChanging: Number(summary.state_changing||0),
    destructive: Number(summary.destructive||0),
    unknown: Number(summary.unknown||0),
    mutability: manifest.provenance?.mutability || 'unknown'
  };
}
module.exports={MCP_FILE_PATTERNS,normalizeWorkspaceRelativePath,isKnownMcpConfigPath,inspectionArgs,doctorArgs,flightArgs,summarizeInspection};
