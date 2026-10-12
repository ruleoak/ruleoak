# OpenAI-style tool adapter

RuleOak accepts OpenAI-style function tool calls and preserves unknown provider fields under adapter metadata.

```js
const call = {
  id: 'call_123',
  type: 'function',
  function: {
    name: 'filesystem.read',
    arguments: JSON.stringify({ path: './public/readme.txt' })
  }
}

const result = await ruleoak.authorizeOpenAIToolCall(call, {
  actor: { type: 'agent', name: 'assistant', session_id: 'run-1' },
  sensitivity: 'public'
})
```

Invalid JSON argument strings are retained as `raw_arguments`; they are not silently discarded. The action still passes through validation, classification and policy.

For a tool-definition array with local executors, use `ruleoak.guardTools(tools, { executors })` so descriptions and JSON schemas stay unchanged while executors are wrapped.
