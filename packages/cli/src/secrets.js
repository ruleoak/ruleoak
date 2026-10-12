/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomBytes, scryptSync, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { atomicWriteFileSync, readBoundedFileSync } from './io/durable-file.js';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const SERVICE = 'RuleOak';
const ENV_RECEIPT = 'RULEOAK_RECEIPT_SECRET';
const ENV_CHECKPOINT = 'RULEOAK_CHECKPOINT_SECRET';
const ENV_AUTHORITY = 'RULEOAK_AUTHORITY_SECRET';
const ENV_PASSPHRASE = 'RULEOAK_SECRET_STORE_PASSPHRASE';

function ensurePrivate(path) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') chmodSync(dirname(path), 0o700);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    input: options.input,
    windowsHide: true,
    env: { ...process.env, ...(options.env || {}) }
  });
}

function available(command, args = ['--version']) {
  try {
    const result = run(command, args);
    return !result.error && result.status !== 127;
  } catch { return false; }
}

function workspaceAccount(baseDir) {
  const digest = createHash('sha256').update(resolve(baseDir)).digest('hex').slice(0, 20);
  return `workspace-${digest}`;
}

export function generateSigningSecret() {
  return randomBytes(32).toString('base64url');
}

export class MemoryCredentialBackend {
  constructor(name = 'memory') { this.name = name; this.values = new Map(); }
  available() { return true; }
  get(account) { return this.values.get(account) || null; }
  set(account, value) { this.values.set(account, value); return true; }
  remove(account) { return this.values.delete(account); }
}

export class MacOSKeychainBackend {
  constructor() { this.name = 'macos-keychain'; }
  available() { return process.platform === 'darwin' && available('/usr/bin/security', ['help']); }
  get(account) {
    const result = run('/usr/bin/security', ['find-generic-password', '-a', account, '-s', SERVICE, '-w']);
    return result.status === 0 ? String(result.stdout || '').trim() || null : null;
  }
  set(account, value) {
    const result = run('/usr/bin/security', ['add-generic-password', '-U', '-a', account, '-s', SERVICE, '-w', value]);
    if (result.status !== 0) throw new Error(`macOS Keychain write failed: ${String(result.stderr || '').trim()}`);
    return true;
  }
  remove(account) {
    const result = run('/usr/bin/security', ['delete-generic-password', '-a', account, '-s', SERVICE]);
    return result.status === 0 || /could not be found/i.test(String(result.stderr || ''));
  }
}

function powershellExecutable() {
  if (available('pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'])) return 'pwsh';
  if (available('powershell.exe', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'])) return 'powershell.exe';
  return null;
}

function psQuote(value) { return `'${String(value).replaceAll("'", "''")}'`; }

export class WindowsCredentialManagerBackend {
  constructor() { this.name = 'windows-credential-manager'; this.executable = powershellExecutable(); }
  available() { return process.platform === 'win32' && Boolean(this.executable); }
  get(account) {
    if (!this.available()) return null;
    const script = `$v=New-Object Windows.Security.Credentials.PasswordVault;try{$c=$v.Retrieve(${psQuote(SERVICE)},${psQuote(account)});$c.RetrievePassword();[Console]::Out.Write($c.Password)}catch{exit 3}`;
    const result = run(this.executable, ['-NoProfile', '-NonInteractive', '-Command', script]);
    return result.status === 0 ? String(result.stdout || '') || null : null;
  }
  set(account, value) {
    if (!this.available()) throw new Error('Windows Credential Manager backend is unavailable');
    const script = `$v=New-Object Windows.Security.Credentials.PasswordVault;try{$old=$v.Retrieve(${psQuote(SERVICE)},${psQuote(account)});$v.Remove($old)}catch{};$v.Add((New-Object Windows.Security.Credentials.PasswordCredential(${psQuote(SERVICE)},${psQuote(account)},${psQuote(value)})))`;
    const result = run(this.executable, ['-NoProfile', '-NonInteractive', '-Command', script]);
    if (result.status !== 0) throw new Error(`Windows Credential Manager write failed: ${String(result.stderr || '').trim()}`);
    return true;
  }
  remove(account) {
    if (!this.available()) return false;
    const script = `$v=New-Object Windows.Security.Credentials.PasswordVault;try{$c=$v.Retrieve(${psQuote(SERVICE)},${psQuote(account)});$v.Remove($c)}catch{};`;
    const result = run(this.executable, ['-NoProfile', '-NonInteractive', '-Command', script]);
    return result.status === 0;
  }
}

export class LinuxSecretServiceBackend {
  constructor() { this.name = 'linux-secret-service'; }
  available() { return process.platform === 'linux' && available('secret-tool', ['--help']); }
  get(account) {
    if (!this.available()) return null;
    const result = run('secret-tool', ['lookup', 'service', 'ruleoak', 'account', account]);
    return result.status === 0 ? String(result.stdout || '').trim() || null : null;
  }
  set(account, value) {
    if (!this.available()) throw new Error('Linux Secret Service backend is unavailable');
    const result = run('secret-tool', ['store', '--label', 'RuleOak local signing secret', 'service', 'ruleoak', 'account', account], { input: value });
    if (result.status !== 0) throw new Error(`Linux Secret Service write failed: ${String(result.stderr || '').trim()}`);
    return true;
  }
  remove(account) {
    if (!this.available()) return false;
    const result = run('secret-tool', ['clear', 'service', 'ruleoak', 'account', account]);
    return result.status === 0;
  }
}

function deriveKey(passphrase, salt) { return scryptSync(String(passphrase), salt, 32); }

export class EncryptedFileCredentialBackend {
  constructor(filePath, options = {}) {
    this.name = 'encrypted-local-fallback';
    this.filePath = resolve(filePath);
    this.passphrase = options.passphrase;
  }
  available() { return Boolean(this.passphrase); }
  #load() {
    if (!existsSync(this.filePath)) return {};
    if (!this.passphrase) throw new Error(`${ENV_PASSPHRASE} is required for encrypted local secret storage`);
    const envelope = JSON.parse(readBoundedFileSync(this.filePath,{maxBytes:1024*1024,label:'encrypted local secret store'}));
    const salt = Buffer.from(envelope.salt, 'base64');
    const iv = Buffer.from(envelope.iv, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(this.passphrase, salt), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  }
  #save(values) {
    if (!this.passphrase) throw new Error(`${ENV_PASSPHRASE} is required for encrypted local secret storage`);
    ensurePrivate(this.filePath);
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', deriveKey(this.passphrase, salt), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(values), 'utf8'), cipher.final()]);
    const envelope = {
      format: 'ruleoak-encrypted-secret-store-v1',
      algorithm: 'aes-256-gcm+scrypt',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64')
    };
    atomicWriteFileSync(this.filePath, JSON.stringify(envelope, null, 2) + '\n', { mode: 0o600,maxBytes:1024*1024,label:'encrypted local secret store' });
  }
  get(account) { return this.available() ? this.#load()[account] || null : null; }
  set(account, value) { const values = this.#load(); values[account] = value; this.#save(values); return true; }
  remove(account) {
    if (!existsSync(this.filePath)) return false;
    const values = this.#load();
    const existed = Object.hasOwn(values, account);
    delete values[account];
    if (Object.keys(values).length === 0) unlinkSync(this.filePath);
    else this.#save(values);
    return existed;
  }
}

export function detectCredentialBackend(baseDir, options = {}) {
  if (options.backend) return options.backend;
  const platformBackends = [new MacOSKeychainBackend(), new WindowsCredentialManagerBackend(), new LinuxSecretServiceBackend()];
  const selected = platformBackends.find(backend => backend.available());
  if (selected) return selected;
  if (options.allowEncryptedFallback) {
    return new EncryptedFileCredentialBackend(resolve(baseDir, '.ruleoak', 'secrets.enc'), {
      passphrase: options.passphrase || process.env[ENV_PASSPHRASE]
    });
  }
  return null;
}

export class RuleOakSecretManager {
  constructor(baseDir, options = {}) {
    this.baseDir = resolve(baseDir);
    this.env = options.env || process.env;
    this.account = options.account || workspaceAccount(this.baseDir);
    this.backend = detectCredentialBackend(this.baseDir, options);
  }

  status() {
    const envReceipt = Boolean(this.env[ENV_RECEIPT]);
    const envCheckpoint = Boolean(this.env[ENV_CHECKPOINT]);
    const envAuthority = Boolean(this.env[ENV_AUTHORITY]);
    let stored = false;
    let backendError = null;
    try { stored = Boolean(this.backend?.get(this.account)); }
    catch (error) { backendError = error.message; }
    return {
      backend: this.backend?.name || 'unavailable',
      available: Boolean(this.backend),
      stored,
      environment_override: envReceipt || envCheckpoint || envAuthority,
      receipt_environment_override: envReceipt,
      checkpoint_environment_override: envCheckpoint,
      authority_environment_override: envAuthority,
      backend_error: backendError
    };
  }

  getSecret(purpose = 'receipt') {
    const envName = purpose === 'checkpoint' ? ENV_CHECKPOINT : purpose === 'authority' ? ENV_AUTHORITY : ENV_RECEIPT;
    if (this.env[envName]) return { secret: this.env[envName], source: 'environment', backend: envName };
    const shared = this.backend?.get(this.account) || null;
    return shared ? { secret: shared, source: 'credential-store', backend: this.backend.name } : { secret: null, source: 'none', backend: this.backend?.name || 'unavailable' };
  }

  init(options = {}) {
    if (!this.backend) throw new Error('No OS credential store is available. Re-run with --allow-encrypted-fallback and set RULEOAK_SECRET_STORE_PASSPHRASE to explicitly use encrypted local storage');
    if (!this.backend.available()) throw new Error(`Credential backend ${this.backend.name} is unavailable or missing its required passphrase`);
    if (this.backend.get(this.account) && !options.force) return { created: false, rotated: false, backend: this.backend.name, reason: 'already-initialized' };
    this.backend.set(this.account, options.secret || generateSigningSecret());
    return { created: true, rotated: Boolean(options.force), backend: this.backend.name };
  }

  rotate() { return this.init({ force: true }); }
  remove() { return { removed: Boolean(this.backend?.remove(this.account)), backend: this.backend?.name || 'unavailable' }; }
}

export const SECRET_ENVIRONMENT_NAMES = Object.freeze([ENV_RECEIPT, ENV_CHECKPOINT, ENV_AUTHORITY, ENV_PASSPHRASE]);
