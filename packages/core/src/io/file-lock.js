/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';

function sleepSync(ms) {
  if (ms <= 0) return;
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

function readHolder(lockPath) {
  try {
    const value = JSON.parse(readFileSync(lockPath, 'utf8'));
    return value && typeof value === 'object' ? value : null;
  } catch { return null; }
}

function pidAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error?.code === 'EPERM'; }
}

function stale(lockPath, staleMs) {
  try {
    if (Date.now() - statSync(lockPath).mtimeMs <= staleMs) return false;
    const holder = readHolder(lockPath);
    if (holder?.host === hostname() && Number.isSafeInteger(holder?.pid) && pidAlive(holder.pid)) return false;
    return true;
  } catch { return false; }
}

function unlinkIfOwned(lockPath, token) {
  const holder = readHolder(lockPath);
  if (!holder || holder.token !== token) return false;
  try { unlinkSync(lockPath); return true; } catch { return false; }
}

export function withFileLock(targetPath, fn, options = {}) {
  const lockPath = options.lockPath || `${targetPath}.lock`;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(0, options.timeoutMs) : 5000;
  const retryMs = Number.isFinite(options.retryMs) ? Math.max(1, options.retryMs) : 10;
  const staleMs = Number.isFinite(options.staleMs) ? Math.max(1000, options.staleMs) : 30000;
  const started = Date.now();
  const token = randomUUID();
  let fd;
  while (fd === undefined) {
    try {
      fd = openSync(lockPath, 'wx', 0o600);
      writeFileSync(fd, JSON.stringify({ token, pid: process.pid, host: hostname(), acquired_at: new Date().toISOString() }) + '\n', 'utf8');
      fsyncSync(fd);
    } catch (error) {
      if (fd !== undefined) { try { closeSync(fd); } catch {} fd = undefined; }
      if (error?.code !== 'EEXIST') throw error;
      if (existsSync(lockPath) && stale(lockPath, staleMs)) {
        const holder = readHolder(lockPath);
        try {
          // Delete only the exact stale holder we inspected. If another owner
          // raced in, the token check prevents us from deleting its lock.
          if (holder?.token) unlinkIfOwned(lockPath, holder.token);
          else unlinkSync(lockPath);
        } catch {}
        continue;
      }
      if (Date.now() - started >= timeoutMs) {
        let holder = '';
        try { holder = readFileSync(lockPath, 'utf8').trim(); } catch {}
        throw new Error(`timed out acquiring file lock: ${lockPath}${holder ? ` (${holder})` : ''}`);
      }
      sleepSync(retryMs);
    }
  }
  try { return fn(); }
  finally {
    try { closeSync(fd); } catch {}
    unlinkIfOwned(lockPath, token);
  }
}
