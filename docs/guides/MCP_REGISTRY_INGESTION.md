# Official MCP Registry ingestion

RuleOak v0.50.0 can ingest public metadata from the Official MCP Registry into a deterministic local snapshot and create an inspection queue for published Streamable HTTP endpoints.

Registry metadata is **discovery evidence, not capability evidence**. Names, descriptions, package metadata and transport URLs do not prove which tools a server exposes or what effects those tools can cause. RuleOak therefore marks registry-derived targets `uninspected` and never invokes mutating tools during registry ingestion.

```bash
ruleoak inspect registry fetch --out .ruleoak/registry/snapshot.json --latest-only
ruleoak inspect registry queue --snapshot .ruleoak/registry/snapshot.json --out .ruleoak/registry/queue.json
```

Fetch is bounded by `--limit` and `--max-pages`. Tests use a local deterministic registry fixture; release qualification does not depend on the live registry.

## Custom registry mirrors

The official MCP Registry is the default trust root for this discovery command. A custom registry endpoint is refused unless `--allow-custom-registry` is supplied explicitly. Plain HTTP is refused except for loopback test/mirror use with both `--allow-custom-registry` and `--allow-insecure-custom-registry`. Registry metadata remains discovery evidence only.
