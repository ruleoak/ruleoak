/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
import { rmSync } from 'node:fs';
rmSync('.ruleoak-demo-output/mcp-filesystem-guard', { recursive: true, force: true });
console.log('MCP filesystem guard demo output removed');
