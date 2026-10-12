# Effect Profiles

An Effect Profile is the explicit semantic bridge between a tool call and an observable postcondition.

RuleOak never grants trusted effect semantics from a tool name alone. A generic server exposing `write_file` might mutate a local filesystem, a remote workspace, an object store, or a virtual document model. Those are different effects and require different verification.

## Profile requirements

A trustworthy profile should define:

1. **provenance** — which implementation/route the semantics apply to;
2. **operation identity** — exact supported method/tool shapes;
3. **bounded resources** — reviewed roots, repositories, APIs, namespaces or other scopes;
4. **postcondition** — observable state that proves success, failure, or ambiguity;
5. **pre-state requirements** — what must be captured before dispatch to prove no-effect safely;
6. **retry safety** — whether a verified no-effect state is also safe to retry;
7. **ambiguity behavior** — cases that must remain manual/unknown.

## Built-in profile class

The current public implementation includes a bounded local-filesystem profile for supported exact shapes such as exact-content write, directory creation, file move and exact-unique edit. Canonical paths and reviewed roots are revalidated at verification time.

## Contribution standard

A new profile should include:

- positive success fixture;
- confirmed-no-effect fixture where mathematically/semantically valid;
- response-loss-after-success fixture;
- partial/ambiguous fixture;
- root/scope escape negative fixture;
- provenance mismatch negative fixture;
- verifier-state tamper fixture where persistence is used;
- documentation of unsupported shapes.

If the semantics cannot be established confidently, the correct result is `UNKNOWN` or `MANUAL_REVIEW`.

## Open profile policy

Auditable Effect Profiles and security corrections belong in the open project. New profiles should be accepted based on provenance, deterministic fixtures, bounded semantics and maintenance value.
