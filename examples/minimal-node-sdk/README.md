# Minimal Node.js SDK example

This is the smallest source-tree example of guarding one function with `createRuleOak()` and `guardFunction()`.

```bash
node examples/minimal-node-sdk/index.mjs
```

Expected result:

```text
hello from a guarded function
decision: allow
evidence: <temporary-path>/.ruleoak/evidence.jsonl
grant consumed: yes
```

The example uses a temporary directory, performs only a local read, and removes its temporary files when complete.

For an npm consumer project, install `@ruleoak/core` and initialize a workspace using `npx @ruleoak/cli@latest init --policy-pack cautious`.
