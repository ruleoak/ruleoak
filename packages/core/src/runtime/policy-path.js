/*
 * Copyright © 2026 RuleOak Pte. Ltd.
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
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolve, relative, isAbsolute, sep } from 'node:path';
import { homedir } from 'node:os';

function isInside(child, parent) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function classifyFilesystemAction(operation, target, projectRoot = process.cwd()) {
  const abs = resolve(projectRoot, target);
  const home = homedir();
  const protectedPrefixes = [resolve(projectRoot, '.git'), resolve(home, '.ssh')];
  const outsideProject = !isInside(abs, projectRoot);
  const protectedPath = protectedPrefixes.some(prefix => isInside(abs, prefix));
  return {
    type: operation === 'read' ? 'filesystem.read' : operation === 'write' ? 'filesystem.write' : 'filesystem.delete',
    target: abs,
    metadata: { operation, projectRoot: resolve(projectRoot), outsideProject, protectedPath }
  };
}

export function defaultPolicy(projectRoot = process.cwd()) {
  const root = resolve(projectRoot);
  const home = homedir();
  return {
    policyVersion: 2,
    defaultAction: 'needs_approval',
    projectRoot: root,
    rules: [
      {
        id: 'deny-protected-local-resources',
        description: 'Protect source-control metadata and SSH credentials',
        effect: 'deny',
        priority: 200,
        actions: ['filesystem.*', 'mcp.filesystem.*'],
        resources: [resolve(root, '.git/**'), resolve(home, '.ssh/**'), '~/.ssh/**']
      },
      {
        id: 'deny-destructive-and-financial',
        effect: 'deny',
        priority: 100,
        actions: ['filesystem.delete', 'mcp.filesystem.delete', 'payment.*', 'mcp.payment.*']
      },
      {
        id: 'allow-low-risk-local-read',
        effect: 'allow',
        priority: 30,
        actions: ['filesystem.read', 'mcp.filesystem.read'],
        riskAtMost: 'low',
        conditions: { dataFlows: ['local'], sideEffects: ['read_only'] }
      },
      {
        id: 'review-side-effects',
        effect: 'needs_approval',
        priority: 20,
        actions: ['filesystem.write', 'email.send', 'network.*', 'memory.read', 'memory.write', 'shell.run', 'mcp.*']
      }
    ]
  };
}
