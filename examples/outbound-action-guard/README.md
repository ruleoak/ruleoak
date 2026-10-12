# Outbound action guard

This example protects simulated email/webhook-style actions without making network calls.

```bash
npm run demo:outbound-action
```

It demonstrates:

- a known internal destination allowed by policy
- an external destination requiring one-time approval
- a credential-like secret in an external payload denied by the hard exfiltration guard
- automatic receipt consumption
- a generated evidence bundle

Architecture: [`architecture.mmd`](architecture.mmd). Policy: [`policy.json`](policy.json). Expected summary: [`expected-output.txt`](expected-output.txt).

```bash
node examples/outbound-action-guard/test.mjs
node examples/outbound-action-guard/cleanup.mjs
```

No email, webhook or network request is sent. All executors are local mocks.
