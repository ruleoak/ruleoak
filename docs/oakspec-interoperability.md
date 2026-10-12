# OakSpec interoperability

OakSpec 1.0 is RuleOak's preview interoperability profile for durable Intent, evidence requirements, semantic-change provenance and candidate discovery.

`ruleoak oakspec export` exports declared RuleOak Intent without inventing behavior. `ruleoak oakspec import` supports OpenAPI, tests, CI, Git, `AGENTS.md`, documentation/spec Markdown and MCP tool manifests.

Every imported record has status `CANDIDATE`. Import never grants execution authority, never creates verification evidence and never converts inferred material into declared Intent. Promotion requires a separate explicit authority-bearing workflow.

OakSpec 1.0 is not represented by this repository as an externally ratified or adopted industry standard. The ecosystem maturity is `preview`; external adoption evidence is `NOT_RUN` for OakSpec Interoperability.
