/*
 * Copyright © 2026 Sun Shaobin.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-FileCopyrightText: 2026 Sun Shaobin
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['--workspace', '@ruleoak/protocol', 'test']],
  ['npm', ['--workspace', '@ruleoak/core', 'test']],
  ['npm', ['--workspace', '@ruleoak/cli', 'test']]
];
for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('root tests passed');
