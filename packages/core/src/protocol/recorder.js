/*
 * Copyright © 2026 The RuleOak Authors.
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
 * SPDX-FileCopyrightText: 2026 The RuleOak Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadJsonLines, validateEvidenceEvent } from '@ruleoak/protocol';

export const GENESIS_HASH = 'GENESIS';

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function eventHash(previousHash, eventWithoutHash) {
  return createHash('sha256').update(previousHash + stableStringify(eventWithoutHash)).digest('hex');
}

export class EvidenceRecorder {
  constructor(filePath) {
    this.filePath = filePath;
    mkdirSync(dirname(filePath), { recursive: true });
  }

  readEvents() {
    if (!existsSync(this.filePath)) return [];
    const text = readFileSync(this.filePath, 'utf8');
    return loadJsonLines(text);
  }

  append(action, decision, timestamp = new Date().toISOString()) {
    const events = this.readEvents();
    const previousHash = events.length ? events[events.length - 1].hash : GENESIS_HASH;
    const normalizedDecision = decision && decision.action === 'block' ? { ...decision, action: 'deny' } : decision;
    const content = { index: events.length + 1, timestamp, action, decision: normalizedDecision, previousHash };
    const hash = eventHash(previousHash, content);
    const event = { ...content, hash };
    const validation = validateEvidenceEvent(event);
    if (!validation.valid) throw new Error(`invalid evidence event: ${validation.errors.join('; ')}`);
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`);
    return event;
  }
}

export class RuleOakFlightRecorder extends EvidenceRecorder {
  writeEvent(action, decision, matchedRule, timestamp = new Date().toISOString()) {
    const enrichedDecision = { ...decision, matchedRule: matchedRule || decision?.matchedRule || decision?.matchedPattern || null };
    return this.append(action, enrichedDecision, timestamp);
  }
}

export function verifyEvidence(events) {
  let previousHash = GENESIS_HASH;
  const errors = [];
  events.forEach((event, idx) => {
    const validation = validateEvidenceEvent(event);
    if (!validation.valid) errors.push(`line ${idx + 1}: ${validation.errors.join('; ')}`);
    if (event.index !== idx + 1) errors.push(`line ${idx + 1}: expected index ${idx + 1}, got ${event.index}`);
    if (event.previousHash !== previousHash) errors.push(`line ${idx + 1}: previousHash mismatch`);
    const { hash, ...withoutHash } = event;
    const expected = eventHash(previousHash, withoutHash);
    if (hash !== expected) errors.push(`line ${idx + 1}: hash mismatch`);
    previousHash = event.hash;
  });
  return { ok: errors.length === 0, errors, count: events.length };
}
