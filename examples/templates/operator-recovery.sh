#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ruleoak protect check --require-effect-boundary
ruleoak effect pending
# Re-check only bounded serializable postconditions. This does NOT execute the original action or retry it.
ruleoak effect reconcile --limit 20
ruleoak protect value
