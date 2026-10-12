#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
# Replace the server command with your reviewed local-filesystem MCP server.
# The effect root bounds which canonical filesystem paths may receive automatic effect semantics.
ruleoak mcp wrap \
  --effect-profile local-filesystem \
  --effect-root "$PWD/workspace" \
  -- npx --yes @modelcontextprotocol/server-filesystem "$PWD/workspace"
