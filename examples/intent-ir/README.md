# Intent IR v0.1 implementation-independence example

`radio-playback.intent.json` is the durable RuleOak Intent IR document. It contains product behavior, constraints, invariants, budgets, risks, fallback expectations and evidence requirements, but **no source-file paths or implementation language**.

The two `*.binding.json` files intentionally map the same capability IDs to different implementation structures:

- Android/Kotlin modules;
- desktop/TypeScript modules.

Those bindings are illustrative implementation metadata, not part of the core Intent IR v0.1 contract. This separation is the Intent IR graduation property: implementation structure can change while the durable intent remains unchanged.
