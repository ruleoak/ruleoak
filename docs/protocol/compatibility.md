# RuleOak Protocol Compatibility

RuleOak Core v1.6 defines `ruleoak.governance.v1` as the first governance record protocol.

Compatibility rules:

- Required fields must remain stable within protocol v1.
- New optional fields may be added.
- Existing enum values should not be removed within protocol v1.
- Breaking changes require a future protocol version.
- SDKs and adapters should include conformance fixtures before public release.

The package version and the protocol version are related but separate. RuleOak Core can move from v1.6 to later releases while still emitting `ruleoak.governance.v1` records.
