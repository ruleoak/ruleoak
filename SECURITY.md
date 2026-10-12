# RuleOak Security Policy

## Supported versions

| Version | Security fixes |
|---|---|
| `0.50.x` | Supported current public developer-preview line |

RuleOak v0.50.0 is the first public release line. Earlier internal development versions are not public support lines.

RuleOak is pre-1.0 software. Security-sensitive behavior and APIs can change between minor versions; stable protocol/API surfaces follow the published deprecation policy.

## Report a vulnerability

Do not open a public issue for an undisclosed vulnerability.

Use GitHub private vulnerability reporting for `ruleoak/ruleoak`. Include, where available:

- affected package/version and commit;
- operating system and Node.js version;
- minimal reproduction using synthetic data;
- expected and observed security impact;
- whether the issue crosses the documented RuleOak boundary;
- whether false effect certainty, replay, policy bypass or evidence-integrity failure is involved;
- suggested remediation.

Do not include real secrets, customer evidence, employer data, or third-party confidential material.

## High-priority security invariants

Reports are especially valuable when they show any of the following:

- a denied action being forwarded;
- an `ExecutionLease` being consumed more than once;
- an action/lease/effect binding accepting changed identity;
- a lost/failed response being treated as proof of no side effect without sufficient evidence;
- an untrusted tool name or localhost route receiving trusted effect semantics;
- filesystem postcondition verification escaping reviewed roots or accepting path/symlink rebinding;
- persisted verifier state being changed without detection;
- tampered evidence being accepted as valid;
- raw secrets being retained in default evidence or reports;
- a release/supply-chain path allowing unaudited or unexpected artifacts.

## Important limitations

RuleOak controls only supported actions that pass through a RuleOak-controlled/cooperating SDK, CLI wrapper, gateway or service boundary. It is not an operating-system sandbox, kernel reference monitor, EDR, anti-malware system or universal prompt-injection detector.

A healthy policy/interception route is not automatically a full Effect Boundary. Automatic effect certainty requires trusted operation semantics. Unsupported/custom semantics remain `UNKNOWN` / manual-review work.

The local evidence chain is tamper-evident within the file sequence, not tamper-proof against a privileged local actor who can replace/delete the entire store. Stronger threat models require external protected storage or separate service identity.

Prompt-injection and secret-detection signals are defense in depth and can have false positives/negatives. They do not replace least privilege, sandboxing or application-specific validation.

## Secure defaults

RuleOak aims to:

- fail closed on invalid policy, authority, verifier binding and unsupported semantics;
- make deny override permit;
- deny critical actions unless policy explicitly opts in;
- consume one-use authority before supported consequential dispatch;
- never automatically retry a consequential effect;
- keep unsupported effect semantics explicit rather than inferred from tool names;
- avoid recording full private content by default;
- use restrictive local permissions where supported;
- bind decisions/effects to exact action and policy identity;
- keep external telemetry off unless explicitly enabled.

## Release and supply-chain security

The public repository is designed to use:

- lockfile-based installs;
- CodeQL and dependency review;
- REUSE/SPDX licensing checks;
- OpenSSF Scorecard monitoring;
- SBOM generation for release candidates;
- GitHub artifact attestations for public release artifacts when releases are built on GitHub;
- npm trusted publishing/OIDC for published packages.

Repository-level controls such as MFA, branch rules, required checks and private vulnerability reporting must also be enabled on the fresh authoritative GitHub repository. See `docs/security/OPEN_SOURCE_SECURITY_BASELINE.md`.
