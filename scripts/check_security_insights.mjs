/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('security-insights.yml','utf8'));
assert.equal(data.header?.['schema-version'], '2.2.0');
for (const key of ['last-updated','last-reviewed','url']) assert.ok(data.header?.[key], `missing header.${key}`);
assert.match(data.header.url, /^https:\/\//);
assert.equal(data.project?.name, 'RuleOak');
assert.ok(Array.isArray(data.project?.administrators) && data.project.administrators.length >= 1);
assert.ok(Array.isArray(data.project?.repositories) && data.project.repositories.length >= 1);
assert.equal(data.project?.['vulnerability-reporting']?.['reports-accepted'], true);
assert.equal(typeof data.project?.['vulnerability-reporting']?.['bug-bounty-available'], 'boolean');
const repo=data.repository;
for (const key of ['url','status','accepts-change-request','accepts-automated-change-request','license','security']) assert.notEqual(repo?.[key], undefined, `missing repository.${key}`);
assert.ok(Array.isArray(repo['core-team']) && repo['core-team'].length >= 1);
assert.equal(repo.license.expression,'Apache-2.0');
assert.ok(repo.security.assessments && typeof repo.security.assessments === 'object' && !Array.isArray(repo.security.assessments));
assert.equal(repo.release?.['automated-pipeline'],true);
assert.ok(Array.isArray(repo.release?.['distribution-points']) && repo.release['distribution-points'].length >= 1);
console.log('OpenSSF Security Insights v2.2.0 source-shape check passed');
