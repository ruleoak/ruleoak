/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

function ensurePrivateDir(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') chmodSync(path, 0o700);
}

export function fsyncDirectorySync(path) {
  if (process.platform === 'win32') return;
  let fd;
  try {
    fd = openSync(path, 'r');
    fsyncSync(fd);
  } catch (error) {
    // Some filesystems/platforms reject directory fsync. Do not hide ordinary
    // file fsync failures, but tolerate only the known unsupported cases here.
    if (!['EINVAL', 'ENOTSUP', 'EISDIR', 'EPERM', 'EBADF'].includes(error?.code)) throw error;
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch {}
  }
}

export function readBoundedFileSync(path, options = {}) {
  const maxBytes = Number.isSafeInteger(options.maxBytes) && options.maxBytes > 0 ? options.maxBytes : 8 * 1024 * 1024;
  const label = options.label || 'file';
  if (!existsSync(path)) return options.missingValue;
  const size = statSync(path).size;
  if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) throw new Error(`${label} exceeds maxBytes (${maxBytes})`);
  const value = readFileSync(path, options.encoding || 'utf8');
  if (Buffer.byteLength(value, options.encoding || 'utf8') > maxBytes) throw new Error(`${label} exceeds maxBytes (${maxBytes})`);
  return value;
}

export function atomicWriteFileSync(path, data, options = {}) {
  const target = resolve(path);
  const parent = dirname(target);
  ensurePrivateDir(parent);
  const mode = Number.isInteger(options.mode) ? options.mode : 0o600;
  const encoding = options.encoding || 'utf8';
  const maxBytes = Number.isSafeInteger(options.maxBytes) && options.maxBytes > 0 ? options.maxBytes : null;
  const bytes = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(String(data), encoding);
  if (maxBytes !== null && bytes > maxBytes) throw new Error(`${options.label || 'file'} exceeds maxBytes (${maxBytes})`);
  const temp = resolve(parent, `.${target.split('/').pop()}.${process.pid}.${randomUUID()}.tmp`);
  let fd;
  try {
    fd = openSync(temp, 'wx', mode);
    writeFileSync(fd, data, Buffer.isBuffer(data) ? undefined : encoding);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    if (process.platform !== 'win32') chmodSync(temp, mode);
    renameSync(temp, target);
    if (process.platform !== 'win32') chmodSync(target, mode);
    fsyncDirectorySync(parent);
  } catch (error) {
    if (fd !== undefined) try { closeSync(fd); } catch {}
    try { unlinkSync(temp); } catch {}
    throw error;
  }
  return target;
}

export function durableExclusiveCreateSync(path, data, options = {}) {
  const target = resolve(path);
  const parent = dirname(target);
  ensurePrivateDir(parent);
  const mode = Number.isInteger(options.mode) ? options.mode : 0o600;
  const encoding = options.encoding || 'utf8';
  let fd;
  try {
    fd = openSync(target, 'wx', mode);
    writeFileSync(fd, data, Buffer.isBuffer(data) ? undefined : encoding);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    if (process.platform !== 'win32') chmodSync(target, mode);
    fsyncDirectorySync(parent);
    return { created: true, path: target };
  } catch (error) {
    if (fd !== undefined) try { closeSync(fd); } catch {}
    if (error?.code === 'EEXIST') return { created: false, path: target };
    try { unlinkSync(target); } catch {}
    throw error;
  }
}
