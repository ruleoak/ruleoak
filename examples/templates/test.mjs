/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { runFilesystemTemplate } from './filesystem-write-effect-boundary.mjs';
import { runHttpTemplate } from './http-idempotency-effect-boundary.mjs';
import { runCustomTemplate } from './custom-tool-fail-closed.mjs';
import { runGitTemplate } from './git-commit-effect-boundary.mjs';
const fsResult=await runFilesystemTemplate(); assert.equal(fsResult.content,'committed once\n'); assert.equal(fsResult.metadata.effect_state,'confirmed_success'); assert.equal(fsResult.metadata.retry_disposition,'do_not_retry');
const httpResult=await runHttpTemplate(); assert.equal(httpResult.remoteHasOrder,true); assert.equal(httpResult.metadata.effect_state,'confirmed_success'); assert.equal(httpResult.metadata.retry_disposition,'do_not_retry');
const custom=await runCustomTemplate(); assert.equal(custom.effect_state,'unknown'); assert.equal(custom.retry_disposition,'verify_before_retry');
const git=await runGitTemplate(); if(!git.skipped){assert.equal(git.metadata.effect_state,'confirmed_success');assert.equal(git.metadata.retry_disposition,'do_not_retry');}
console.log('Community developer template tests passed');
