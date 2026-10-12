/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */
import { rmSync } from 'node:fs';
rmSync('.ruleoak-demo-output/outbound-action-guard', { recursive: true, force: true });
console.log('outbound action guard demo output removed');
