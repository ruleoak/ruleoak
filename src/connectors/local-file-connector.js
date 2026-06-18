import { readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createConnectorEvidence } from "./connector-records.js";

export class LocalFileEvidenceConnector {
  constructor({ workspaceRoot = process.cwd(), id = "local_files" } = {}) {
    this.workspaceRoot = resolve(workspaceRoot);
    this.id = id;
  }

  safePath(path) {
    const full = resolve(this.workspaceRoot, path);
    if (!full.startsWith(this.workspaceRoot)) throw new Error(`Path outside workspace: ${path}`);
    return full;
  }

  readEvidence(path, { subject = path, claim = "Local file was read as evidence." } = {}) {
    const full = this.safePath(path);
    const stat = statSync(full);
    if (!stat.isFile()) throw new Error(`Not a file: ${path}`);
    const text = readFileSync(full, "utf8");
    return createConnectorEvidence({
      connector: this.id,
      source: relative(this.workspaceRoot, full),
      subject,
      claim,
      value: text.slice(0, 4000),
      metadata: { bytes: stat.size, truncated: text.length > 4000 }
    });
  }
}
