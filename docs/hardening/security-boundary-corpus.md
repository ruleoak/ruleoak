# Security boundary test corpus

RuleOak Core includes a corpus-style safety check for common AI tool-call risks.

The corpus checks that dangerous actions remain blocked or approval-gated by policy and sandbox controls:

- destructive filesystem actions
- secret-file reads
- external network calls
- external messages
- ticketing write actions
- cloud LLM calls that require approval

This is not an external security review. It is local automated evidence that RuleOak keeps its documented boundaries across releases.
