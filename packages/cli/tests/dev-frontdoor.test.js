/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {resolveDevBuildInbox,RULEOAK_DEV_BUILD_INBOX_ENV} from '../src/dev-frontdoor.js';
assert.equal(resolveDevBuildInbox({env:{}}),null);
assert.equal(resolveDevBuildInbox({env:{[RULEOAK_DEV_BUILD_INBOX_ENV]:'./build-inbox'}}),resolve('./build-inbox'));
assert.equal(resolveDevBuildInbox({cliValue:'./explicit',env:{[RULEOAK_DEV_BUILD_INBOX_ENV]:'./ignored'}}),resolve('./explicit'));
assert.equal(resolveDevBuildInbox({cliValue:'./explicit',noHandoff:true,env:{[RULEOAK_DEV_BUILD_INBOX_ENV]:'./ignored'}}),null);
console.log('RuleOak Dev front-door unit tests passed');
