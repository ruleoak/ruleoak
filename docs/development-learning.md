# Development Learning Loop

Development Learning turns completed `ruleoak do` runs into reviewable engineering-learning candidates. Candidate generation is non-authoritative. Nothing is promoted implicitly.

A normal one-intent run automatically records candidate decisions, implementation mappings, regression protections, invariant proposals, and evidence-gap proposals when supported by the run history. `ruleoak do --promote-learning` is an explicit user authority that promotes only candidates marked safe for automatic promotion; invariant/evidence-strengthening proposals remain review-required.

Promoted candidates are written as declared Engineering Memory under `.ruleoak/memory/`. Brownfield Understanding/Semantic Impact/Context Compiler/One-Intent Development already consume that memory on later changes. Historical memory may add plan actions and evidence requirements, but it cannot establish PASS for future code; Intent Evidence Authority remains evidence authority.

Advanced review is available through `ruleoak learn development-review <proposal.json>` and explicit promotion through `ruleoak learn development-promote <proposal.json> --yes`.
