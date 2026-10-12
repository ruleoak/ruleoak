# RuleOak threat model

RuleOak is an application-layer cooperating boundary. This threat model describes what the public project is designed to reduce and what remains outside its control.

## Assets

Important assets include:

- authority and policy configuration;
- approval state;
- one-use execution leases;
- effect receipts and observation state;
- local evidence and checkpoints;
- signing/HMAC material where configured;
- protected external resources reached through guarded actions.

## Trust boundaries

RuleOak assumes that:

- the application or transport actually routes the consequential action through RuleOak;
- the local host/user with authority to modify RuleOak policy and secrets is within the deployment trust boundary;
- an Effect Profile is trusted only after its semantics have been reviewed for the exact operation/resource shape;
- external services, transports and tool implementations can fail, lie, change or become unavailable.

## Threats RuleOak directly addresses

### Unauthorized or over-broad action execution

Policy, authority envelopes, approval and delegation constraints can stop a guarded action before execution.

### Replay / stale authorization

One-use execution authority and binding to action/policy identity reduce reuse of an earlier approval/decision for a different or stale action.

### Blind retry after ambiguous execution

Effect receipts, postcondition verification and retry disposition separate confirmed success, confirmed no-effect retry eligibility and unresolved outcomes.

### Policy/capability drift

Fingerprints, capability history and stale-state checks can surface changes rather than silently reusing prior assumptions.

### Evidence ambiguity

Observation quality and explicit unknown states prevent transport status or generic tool labels from being promoted into stronger claims than the evidence supports.

## Threats RuleOak only partially addresses

- prompt/goal injection that influences the action proposal;
- credential misuse within an otherwise authorized process;
- malicious or compromised external tools/servers;
- supply-chain compromise outside RuleOak's source/release controls;
- local evidence tampering by an actor with filesystem/secret access;
- semantic mistakes in a custom Effect Profile.

Defense in depth remains necessary.

## Out of scope

RuleOak does not provide kernel enforcement, endpoint malware detection, universal DLP, secure remote identity federation, full network security, or complete containment of an agent process.

## Failure stance

When decision-critical authority, identity, evidence or postcondition semantics are missing/conflicting, the preferred behavior is to **narrow capability or preserve uncertainty**, not silently broaden authority.

## Deployment questions

Before production-like use, answer:

1. Which exact actions cross RuleOak and which bypass it?
2. Who can modify policy, approval providers, secrets and evidence?
3. Which actions have reviewed Effect Profiles?
4. What happens when an effect is unresolved for minutes or hours?
5. What external identity/authentication protects the tool/service itself?
6. Which evidence must be exported/checkpointed outside the local host?
7. What recovery process exists if RuleOak is unavailable?

See [Security boundary](security-boundary.md) and [Effect verification and safe retry](effect-verification-safe-retry.md).
