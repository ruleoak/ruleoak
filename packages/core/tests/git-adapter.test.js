/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from'node:assert/strict';import{adaptGitAction}from'../src/index.js';const push=adaptGitAction('push','ruleoak/repo',{branch:'fix/1',actor:{id:'a',name:'a'}});assert.equal(push.tool.name,'git.push');assert.equal(push.target.scope,'external');assert.match(push.target.resource,/fix\/1/);console.log('Git adapter tests passed');
