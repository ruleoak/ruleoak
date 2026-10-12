/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, existsSync, openSync, closeSync, readSync, writeSync, fsyncSync, fchmodSync, statSync } from 'node:fs';
import { readBoundedFileSync } from '../io/durable-file.js';
import { dirname } from 'node:path';
import { withFileLock } from '../io/file-lock.js';
import { loadJsonLines, validateEvidenceEvent } from '@ruleoak/protocol';

export const GENESIS_HASH = 'GENESIS';
export const EVIDENCE_RECORDER_LIMITS = Object.freeze({ maxBytes: 64 * 1024 * 1024, maxLineBytes: 1024 * 1024, maxEvents: 200_000 });

function recorderCanonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(recorderCanonicalStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${recorderCanonicalStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

let stableStringifyWarningEmitted = false;
export function stableStringify(value) {
  if (!stableStringifyWarningEmitted) {
    stableStringifyWarningEmitted = true;
    process.emitWarning(
      'stableStringify is deprecated; use canonicalStringify from @ruleoak/core instead.',
      { code: 'RULEOAK_DEP_STABLE_STRINGIFY', type: 'DeprecationWarning' }
    );
  }
  return recorderCanonicalStringify(value);
}

export function eventHash(previousHash, eventWithoutHash) {
  return createHash('sha256').update(previousHash + recorderCanonicalStringify(eventWithoutHash)).digest('hex');
}

function readLastNonEmptyLine(filePath) {
  if (!existsSync(filePath) || statSync(filePath).size === 0) return null;
  const fd = openSync(filePath, 'r');
  try {
    const size = statSync(filePath).size;
    const chunkSize = 8192;
    let position = size;
    let accumulated = '';
    while (position > 0) {
      const length = Math.min(chunkSize, position);
      position -= length;
      const buffer = Buffer.alloc(length);
      readSync(fd, buffer, 0, length, position);
      accumulated = buffer.toString('utf8') + accumulated;
      const lines = accumulated.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length >= 2 || (position === 0 && lines.length >= 1)) return lines[lines.length - 1];
    }
    return null;
  } finally {
    closeSync(fd);
  }
}

export class EvidenceRecorder {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.fsync = options.fsync !== false;
    this.limits = { ...EVIDENCE_RECORDER_LIMITS, ...(options.limits || {}) };
    mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
  }

  _readEventsUnlocked() {
    if (!existsSync(this.filePath)) return [];
    const text = readBoundedFileSync(this.filePath, { maxBytes: this.limits.maxBytes, label: 'evidence log' });
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length > this.limits.maxEvents) throw new Error(`evidence log exceeds maxEvents (${this.limits.maxEvents})`);
    for (let i = 0; i < lines.length; i++) if (Buffer.byteLength(lines[i], 'utf8') > this.limits.maxLineBytes) throw new Error(`evidence line ${i + 1} exceeds maxLineBytes (${this.limits.maxLineBytes})`);
    return loadJsonLines(text);
  }

  readEvents() {
    if (!existsSync(this.filePath)) return [];
    return withFileLock(this.filePath, () => this._readEventsUnlocked());
  }

  _readLastEventUnlocked() {
    const line = readLastNonEmptyLine(this.filePath);
    if (!line) return null;
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`invalid final evidence JSONL line: ${error.message}`); }
  }

  readLastEvent() {
    if (!existsSync(this.filePath)) return null;
    return withFileLock(this.filePath, () => this._readLastEventUnlocked());
  }

  append(action, decision, timestamp = new Date().toISOString(), options = {}) {
    const parsedTimestamp = new Date(timestamp);
    if (!Number.isFinite(parsedTimestamp.getTime())) throw new Error('evidence event timestamp must be a valid date-time');
    const normalizedTimestamp = parsedTimestamp.toISOString();
    return withFileLock(this.filePath, () => {
    const lastEvent = this._readLastEventUnlocked();
    const previousHash = lastEvent?.hash || GENESIS_HASH;
    const normalizedDecision = decision && decision.action === 'block' ? { ...decision, action: 'deny' } : decision;
    const receipt = normalizedDecision?.receipt;
    const content = JSON.parse(JSON.stringify({
      schema_version: '2.0',
      event_id: `evt_${randomUUID()}`,
      index: (lastEvent?.index || 0) + 1,
      timestamp: normalizedTimestamp,
      action,
      decision: normalizedDecision,
      previousHash,
      ...(receipt ? {
        decision_id: receipt.decision_id,
        action_digest: receipt.action_digest,
        policy_digest: receipt.policy_digest
      } : {}),
      ...(options.eventType ? { event_type: options.eventType } : {}),
      ...(options.effectReceipt ? { effect_receipt: options.effectReceipt } : {}),
      ...(options.ledgerPayload ? { ledger_payload: options.ledgerPayload } : {})
    }));
    const hash = eventHash(previousHash, content);
    const event = { ...content, hash };
    const validation = validateEvidenceEvent(event);
    if (!validation.valid) throw new Error(`invalid evidence event: ${validation.errors.join('; ')}`);
    if (event.index > this.limits.maxEvents) throw new Error(`evidence log exceeds maxEvents (${this.limits.maxEvents})`);
    const serialized = `${JSON.stringify(event)}\n`;
    if (Buffer.byteLength(serialized, 'utf8') > this.limits.maxLineBytes) throw new Error(`evidence event exceeds maxLineBytes (${this.limits.maxLineBytes})`);
    const currentBytes = existsSync(this.filePath) ? statSync(this.filePath).size : 0;
    if (currentBytes + Buffer.byteLength(serialized, 'utf8') > this.limits.maxBytes) throw new Error(`evidence log exceeds maxBytes (${this.limits.maxBytes})`);

    const fd = openSync(this.filePath, 'a', 0o600);
    try {
      try { fchmodSync(fd, 0o600); } catch { /* best effort on filesystems without POSIX modes */ }
      writeSync(fd, serialized, null, 'utf8');
      if (this.fsync) fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    return event;
    }, options.lockOptions);
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
    if (event.decision?.receipt?.decision_id && event.decision_id && event.decision.receipt.decision_id !== event.decision_id) errors.push(`line ${idx + 1}: decision_id mismatch`);
    if (event.decision?.receipt?.action_digest && event.action_digest && event.decision.receipt.action_digest !== event.action_digest) errors.push(`line ${idx + 1}: action_digest mismatch`);
    if (event.decision?.receipt?.policy_digest && event.policy_digest && event.decision.receipt.policy_digest !== event.policy_digest) errors.push(`line ${idx + 1}: policy_digest mismatch`);
    previousHash = event.hash;
  });
  return { ok: errors.length === 0, errors, count: events.length };
}
