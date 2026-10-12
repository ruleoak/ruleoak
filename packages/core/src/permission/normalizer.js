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

import { validateActionEnvelope, validateNormalizedToolCall } from '@ruleoak/protocol';
import { splitActionType } from './classifier.js';

function nowIso() { return new Date().toISOString(); }

function categoryFromActionType(type) {
  const { category } = splitActionType(type);
  if (category === 'filesystem') return 'file';
  return category || 'custom';
}

function operationFromActionType(type) {
  const { operation } = splitActionType(type);
  if (operation === 'run') return 'execute';
  return operation || 'execute';
}

export function normalizeToolCall(input, options = {}) {
  const normalizedValidation = validateNormalizedToolCall(input);
  if (normalizedValidation.valid) return input;

  const actionValidation = validateActionEnvelope(input);
  if (!actionValidation.valid) {
    throw new Error(`invalid tool call: ${[...normalizedValidation.errors, ...actionValidation.errors].join('; ')}`);
  }

  const type = input.type || input.action;
  return {
    call_id: input.call_id || input.id || `call_${Date.now()}`,
    timestamp: input.timestamp || nowIso(),
    actor: {
      type: input.actor?.type || input.metadata?.actorType || 'agent',
      name: input.actor?.name || input.metadata?.agent || 'unknown-agent',
      session_id: input.actor?.session_id || input.metadata?.sessionId || options.sessionId || 'default-session',
      ...(input.actor?.id || input.metadata?.agentId || options.agentId ? { id: input.actor?.id || input.metadata?.agentId || options.agentId } : {}),
      ...(input.actor?.issuer || input.metadata?.agentIssuer || options.agentIssuer ? { issuer: input.actor?.issuer || input.metadata?.agentIssuer || options.agentIssuer } : {})
    },
    tool: {
      name: type,
      category: input.metadata?.category || categoryFromActionType(type),
      operation: input.metadata?.operation || operationFromActionType(type)
    },
    target: {
      resource: input.target || input.arguments?.path || input.arguments?.target || '',
      scope: input.metadata?.scope || options.scope || 'local',
      sensitivity: input.metadata?.sensitivity || input.sensitivity || 'unknown'
    },
    arguments: input.arguments || {},
    context: input.context || input.metadata || {}
  };
}

export function actionFromNormalizedToolCall(call, redactedArguments = undefined) {
  const type = call?.tool?.name || `${call?.tool?.category || 'custom'}.${call?.tool?.operation || 'execute'}`;
  return {
    type,
    target: call?.target?.resource || '',
    arguments: redactedArguments ?? call?.arguments ?? {},
    metadata: {
      call_id: call?.call_id,
      actor: call?.actor?.name,
      session_id: call?.actor?.session_id,
      category: call?.tool?.category,
      operation: call?.tool?.operation,
      sensitivity: call?.target?.sensitivity,
      scope: call?.target?.scope,
      model: call?.context?.model,
      app: call?.context?.app,
      source_prompt_hash: call?.context?.source_prompt_hash,
      agent_id: call?.actor?.id,
      agent_issuer: call?.actor?.issuer,
      authority_grant_id: call?.context?.authority_grant?.grant_id || call?.context?.authority_grant_id,
      intent_id: call?.context?.intent_id || call?.context?.authority_grant?.intent_id,
      task_id: call?.context?.task_id || call?.context?.authority_grant?.task_id
    }
  };
}
