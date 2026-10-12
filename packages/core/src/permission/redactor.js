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

export const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----/,
  /\b(password|secret|api[_-]?key|token)\b\s*[:=]\s*[^\s,;]+/i
];

const SECRET_KEY_PATTERN = /(^|[_-])(password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key)($|[_-])/i;

export function containsSecretLikeString(value) {
  return SECRET_PATTERNS.some(pattern => pattern.test(String(value ?? '')));
}

export function containsSecretLike(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return containsSecretLikeString(value);
  if (Array.isArray(value)) return value.some(item => containsSecretLike(item));
  if (typeof value === 'object') {
    return Object.entries(value).some(([key, item]) => SECRET_KEY_PATTERN.test(key) || containsSecretLike(item));
  }
  return false;
}

export function redactString(value) {
  let output = String(value ?? '');
  for (const pattern of SECRET_PATTERNS) output = output.replace(pattern, '[REDACTED_SECRET]');
  return output;
}

export function redactValue(value, key = '') {
  if (SECRET_KEY_PATTERN.test(key)) return '[REDACTED_SECRET]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(item => redactValue(item));
  if (value && typeof value === 'object') return redactObject(value);
  return value;
}

export function redactObject(value = {}) {
  const output = {};
  for (const [key, item] of Object.entries(value || {})) output[key] = redactValue(item, key);
  return output;
}
