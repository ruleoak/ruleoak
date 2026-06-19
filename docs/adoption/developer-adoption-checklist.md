# Developer adoption checklist

A RuleOak integration is adoption-ready when a new developer can answer these questions in 10 minutes:

- What tool calls exist?
- Which calls are allowed, approval-required, or blocked?
- Where is policy stored?
- Where is evidence stored?
- How is a report generated?
- How is a bundle replayed?
- What does RuleOak not claim to do?

Use this validation command:

```bash
npm run adoption:check
```

The check runs the five quickstarts and the real-framework-style adapter example.
