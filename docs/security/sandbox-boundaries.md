# Sandbox Boundaries

RuleOak Core includes four security foundation boundaries.

## Filesystem

- deny by default;
- allow configured workspace paths;
- block common secret paths;
- block path traversal attempts.

## Network

- deny external network by default;
- allow localhost for local model runners when configured;
- record decisions for review.

## Commands

- no arbitrary shell by default;
- commands are classified as allow, deny, or approval-required;
- risky commands can be gated before execution.

## Tools

- tools must be registered;
- tool decisions are evaluated outside model output;
- risky tools can require approval.

## Review status

These boundaries are tested in CI, but they have not yet completed an independent external security review.
