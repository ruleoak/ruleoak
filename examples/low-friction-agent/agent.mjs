/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { input += chunk })
process.stdin.on('end', () => {
  process.stdout.write(input || 'RuleOak low-friction example received no tool calls\n')
})
