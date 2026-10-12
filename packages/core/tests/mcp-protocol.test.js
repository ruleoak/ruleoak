/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { inspectMcpRequest, MCP_PROTOCOL_2026_07_28, MCP_PROTOCOL_2025_06_18 } from '../src/index.js';
const modern=inspectMcpRequest({headers:{'MCP-Protocol-Version':MCP_PROTOCOL_2026_07_28,'Mcp-Method':'tools/call','Mcp-Name':'read_file'},body:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_file',arguments:{}}}});assert.equal(modern.ok,true);assert.equal(modern.stateless,true);
const mismatch=inspectMcpRequest({headers:{'MCP-Protocol-Version':MCP_PROTOCOL_2026_07_28,'Mcp-Method':'tools/list'},body:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_file'}}});assert.equal(mismatch.ok,false);assert.match(mismatch.errors.join(' '),/Mcp-Method/);
const legacy=inspectMcpRequest({headers:{'MCP-Protocol-Version':MCP_PROTOCOL_2025_06_18},body:{jsonrpc:'2.0',id:1,method:'initialize'}});assert.equal(legacy.ok,true);assert.equal(legacy.stateless,false);
console.log('MCP protocol generation tests passed');
