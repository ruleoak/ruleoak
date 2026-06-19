# Release validation

RuleOak Core includes a single release validation command:

```bash
npm run validate:release
```

It runs the main confidence checks used before tagging a release:

- TypeScript typecheck
- full test suite
- governance protocol conformance
- Python SDK conformance fixtures
- 10-minute integration demo
- Tool Guard demo
- local MCP proxy smoke test
- GitHub read-only fixture demo
- Jira read-only fixture demo
- policy pack demo
- approval inbox build/export
- report viewer build
- local telemetry export
- HTML report generation
- compatibility matrix generation

The command writes:

```text
reports/validation/release-validation.json
```

This is not a certification claim. It is a repeatable local release confidence check.
