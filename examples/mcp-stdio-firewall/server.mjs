// SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Example MCP-like server for RuleOak docs. It echoes if a request reaches it.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += String(chunk); });
process.stdin.on('end', () => {
  console.log(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { reachedServer: true, inputLength: input.length } }));
});
