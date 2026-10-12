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

import { createHash } from 'node:crypto';

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeForApproval(normalizedCall = {}) {
  return {
    tool: {
      name: normalizedCall.tool?.name || '',
      category: normalizedCall.tool?.category || '',
      operation: normalizedCall.tool?.operation || ''
    },
    target: {
      resource: normalizedCall.target?.resource || '',
      scope: normalizedCall.target?.scope || '',
      sensitivity: normalizedCall.target?.sensitivity || 'unknown'
    },
    arguments: normalizedCall.arguments || {}
  };
}

export function approvalFingerprint(normalizedCall = {}) {
  return `sha256:${createHash('sha256').update(stableStringify(normalizeForApproval(normalizedCall))).digest('hex')}`;
}

export function approvalSummary(normalizedCall = {}) {
  const toolName = normalizedCall.tool?.name || 'unknown.tool';
  const target = normalizedCall.target?.resource || 'unknown target';
  return `${toolName} -> ${target}`;
}

export function applySessionDecision(decision, normalizedCall, sessionDecisionCache = {}) {
  if (!decision || decision.action !== 'needs_approval') return decision;
  const key = approvalFingerprint(normalizedCall);
  const cached = sessionDecisionCache[key];
  if (!cached) return decision;
  if (cached.decision === 'allow_session') {
    return {
      ...decision,
      action: 'allow',
      reason: `allowed by session approval cache: ${cached.summary || approvalSummary(normalizedCall)}`,
      matchedRule: 'approval-cache:allow_session',
      approvalCacheKey: key
    };
  }
  if (cached.decision === 'deny_session') {
    return {
      ...decision,
      action: 'deny',
      reason: `denied by session approval cache: ${cached.summary || approvalSummary(normalizedCall)}`,
      matchedRule: 'approval-cache:deny_session',
      approvalCacheKey: key
    };
  }
  return decision;
}
