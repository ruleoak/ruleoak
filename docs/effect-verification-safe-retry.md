# Effect verification and safe retry

RuleOak treats authorization and execution outcome as separate authorities. A valid one-use `ExecutionLease` permits one execution attempt; it does not prove what happened after dispatch.

The experimental effect-verification helpers bind postcondition evidence to the exact `EffectReceipt`, lease, decision, and action digest. `buildEffectVerificationRecord` therefore requires the exact `ExecutionLease`; an unbound verification record fails closed instead of claiming exact-action evidence.

The retry invariant is conservative: **never blindly retry a consequential action after an ambiguous result**.

- Confirmed success means **do not retry**.
- A desired postcondition being absent does **not** by itself prove that the prior attempt had no side effect.
- `SAFE_TO_RETRY_WITH_NEW_AUTHORITY` is returned only when the verifier also carries an explicit duplicate-safe/idempotency/no-effect proof (`retry_safe`) or an adapter contract explicitly proves a complete no-effect failure.
- Any retry still requires fresh one-use execution authority.
- Verification records whose effect, lease, decision, or action-digest binding does not match the original execution route to manual review.

HTTP success codes and process exit codes alone do not prove external side effects. A missing target after a write is also not proof of no effect unless the exact pre-dispatch state was captured as absent; the action could have occurred and been undone or competed with. A filesystem digest mismatch, Git HEAD mismatch, or remote-ref mismatch is treated as partial/ambiguous rather than proof that nothing happened.

Initial verifier helpers cover filesystem, Git, process, and HTTP/API boundaries. Network verification is opt-in; callers should provide an explicit postcondition probe for remote APIs rather than inferring success from a response. An HTTP probe may declare retry safety only when it can independently prove no prior effect (for example, by an idempotency-key lookup).

## maturity: runtime and operator path

The high-level Node SDK guarded execution path, MCP Streamable-HTTP gateway, and managed stdio MCP wrapper now perform the authority/effect sequence on the normal execution path: one-use `ExecutionLease`, exactly one dispatch, `EffectReceipt`, independent postcondition verification, and a deterministic retry disposition. A thrown/lost response after dispatch is treated as ambiguous until verification; it is never interpreted as proof that the effect did not occur.

Unresolved effects are retained locally under `.ruleoak/effects/pending/`; a dispatched stdio action whose final record was interrupted is first retained under `.ruleoak/effects/inflight/` so boundary restart cannot erase uncertainty. `ruleoak effect reverify` reruns only a bounded serializable verifier specification; it cannot deserialize or execute arbitrary callback code. `ruleoak effect retry-plan` is advisory and never performs a retry. `safe_to_retry_with_new_authority` means exactly what it says: the previous one-use lease is consumed and a separate future execution would require fresh authority.


### Bounded reconciliation

`ruleoak effect reconcile [--limit N]` is the day-2 incident-recovery loop for pending effects. It processes at most 100 pending records per invocation (20 by default) and re-runs only the same serializable local postconditions accepted by `effect reverify` (currently filesystem and local Git verification with network disabled). Unsupported verifier kinds remain pending as `MANUAL_REQUIRED`.

Reconciliation never dispatches the original action and never performs a retry. A pending action can move to resolved only because a bounded independent postcondition now establishes a non-ambiguous state. A `safe_to_retry_with_new_authority` result remains advisory: any future attempt must still acquire a new one-use authority.

## Provenance and persisted-verifier binding

Automatic MCP filesystem verification is never selected from a filesystem-looking tool name alone. Stdio routes require either recognized reference-filesystem provenance or an explicit reviewed effect profile; HTTP routes require an explicit profile or caller-supplied verifier. Reviewed roots are canonicalized and become part of the postcondition contract. If the target's canonical path changes after dispatch, verification returns partial/ambiguous.

For persisted day-2 recovery, RuleOak stores a canonical binding digest over the effect profile, effect contract, and serializable verifier specification. New effect records anchor that digest to the exact effect ID, one-use lease, and action digest in the verified evidence chain. `effect reverify`/`effect reconcile` reject modified or re-bound verifier state before reading a postcondition.
