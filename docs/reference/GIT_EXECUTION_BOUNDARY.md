# Git execution boundary

The built-in `git-action` adapter is an execution-mode Adapter Contract v1.1 implementation. It consumes a valid one-use ExecutionLease before invoking Git with an argument vector and then emits an EffectReceipt v1.1.

Observation Quality is operation-specific:

- successful local operations whose post-state is checked can use `complete_for_adapter` at the `git-adapter-complete` boundary;
- a failed Git command is `process_return_observed` because RuleOak can establish the process result without claiming a completed external effect;
- a network push is `remote_response_observed` at the `git-remote-response` boundary: the Git process and remote protocol response are observed, but RuleOak does not claim system-wide remote-state truth;
- a local/file remote can reach `complete_for_adapter` only after RuleOak verifies the remote branch ref against the local ref.

Network push remains disabled by default. Local filesystem and `file://` remotes require explicit `allowLocalPush: true`; a network remote additionally requires explicit `allowNetworkPush: true`.
