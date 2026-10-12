# Review continuity

Review Continuity makes a second RuleOak Dev review easier without weakening evidence authority.

- `--save-profile <file>` stores reusable local review inputs (intent/binding/memory files and handoff preference).
- `--profile <file>` reuses those inputs. Conflicting explicit CLI values fail closed rather than silently changing the saved boundary.
- `--receipt-out <file>` writes an immutable review receipt containing the exact candidate/baseline/intent/qualification-policy identities and evidence state.
- `--compare-receipt <file>` compares a prior receipt with the current run. Prior evidence is reusable only when candidate, baseline, intent and qualification-policy identities are unchanged.

A receipt is descriptive evidence from one review. It is not execution authority and it does not make an old PASS current after source or rule changes.
