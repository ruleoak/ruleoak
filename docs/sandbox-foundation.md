# Sandbox Foundation

RuleOak Core includes an deny-by-default sandbox foundation.

The sandbox is a policy decision layer. It does not make RuleOak automatically secure, but it gives workflows a concrete control boundary that can be tested and improved.

## Guards

| Guard | Purpose |
|---|---|
| Filesystem guard | Allow or deny reads and writes based on workspace policy |
| Network guard | Deny external network by default and allow local runner access when configured |
| Command guard | Classify commands as allow, deny, or approval-required |
| Tool guard | Evaluate registered tools before use |

## Run it

```bash
npm run sandbox:inspect
npm run sandbox:demo
npm run test:sandbox
```

## Boundary

This is a sandbox foundation, not an externally security-reviewed sandbox. Use it as a starting control layer and keep real sensitive workflows under additional review.
