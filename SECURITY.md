# Security Policy

RuleOak Core is a local-first governance layer for AI tool calls. Security reports should not be filed as public issues.

## Reporting a vulnerability

Email the project maintainers with:

- impact;
- reproduction steps;
- affected version or commit;
- relevant logs or screenshots;
- suggested mitigation, if available.

Do not include real customer data, API keys, personal notes, or confidential examples. Use synthetic samples.

## Security boundary

RuleOak Core protects the **application-level tool-call decision boundary**. It can evaluate filesystem, network, command, MCP, connector, and adapter tool calls before execution when the host application routes those calls through RuleOak.

RuleOak provides deny-by-default policy patterns, approval-required decisions, evidence records, audit events, report artifacts, and automated boundary tests.

RuleOak is **not** an operating-system sandbox, malware detector, identity provider, DLP system, certified compliance product, or guarantee that an AI application is safe. Tool calls that bypass RuleOak are outside RuleOak's boundary.

Read the detailed model: `docs/trust/security-model.md`.

## Safe use guidance

Before using RuleOak with sensitive data or real systems, review:

- tool permissions;
- local model runner behavior;
- data retention paths;
- logs and generated reports;
- secrets handling;
- network access;
- organizational open-source policy;
- approval responsibility;
- report storage and retention.

For serious use cases, combine RuleOak with least-privilege credentials, sandboxing where needed, secrets management, identity controls, immutable audit storage, and human review for high-risk actions.
