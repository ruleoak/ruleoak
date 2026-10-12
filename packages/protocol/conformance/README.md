# RuleOak Public Protocol Conformance

This directory is a public, implementation-neutral conformance kit. The vector files are ordinary JSON and the runner imports only Node.js standard-library modules. It does not import RuleOak Core.

Run an implementation adapter:

```sh
node conformance/runner.mjs --implementation ./my-ruleoak-conformance-adapter.mjs
```

The adapter must export:

- `validate(contractId, input)` returning a boolean or `{ valid }` / `{ ok }`;
- `canonicalize(value)` returning canonical JSON;
- optional `implementation_id` and `implementation_version` strings.

Canonical JSON recursively sorts object keys by Unicode/code-point order, preserves array order, uses standard JSON string escaping, and emits no insignificant whitespace. Valid vectors include their exact `canonical_json`; invalid vectors are expected to be rejected.

The kit covers Capability Identity/Evidence, Authority Grant, Authority Envelope, delegation attenuation, revocation records, ApprovalResult, ExecutionLease, EffectReceipt, Evidence Bundle v3, adapter descriptors, and CrashLab scenarios. `version-matrix.json` records the public contract versions represented by this kit.

Conformance means the implementation matched these public vectors. It is not a security certification, production-safety guarantee, compatibility promise for future versions, or substitute for raw evidence and implementation review.
