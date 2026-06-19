export declare const RULEOAK_ADAPTER_CONFORMANCE_VERSION: "ruleoak.adapter_conformance.v1";
export declare function createAdapterGuard(args?: Record<string, unknown>): unknown;
export declare function normalizeAdapterDecision(decision?: Record<string, unknown>): Record<string, unknown>;
export declare function evaluateAdapterToolCall(args: Record<string, unknown>): Record<string, unknown>;
export declare function createAdapterResult(args: Record<string, unknown>): Record<string, unknown>;
export declare function runGovernedAdapterTool(args: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function adapterConformanceReport(args?: Record<string, unknown>): Record<string, unknown>;

export declare function createLangGraphToolGuard(args?: Record<string, unknown>): unknown;
export declare function wrapLangGraphTool(args: { name: string; tool: Function; guard?: unknown; manifest?: unknown; policy?: unknown; subject?: string; actor?: string; metadata?: Record<string, unknown>; mode?: string }): Function;
export declare function createLangGraphGovernedNode(args: { name: string; node: Function; guard?: unknown; manifest?: unknown; policy?: unknown; subject?: string; actor?: string; metadata?: Record<string, unknown>; mode?: string }): Function;
export declare function createLangGraphToolSpec(args: { name: string; description?: string; tool: Function; guard?: unknown; manifest?: unknown; policy?: unknown; subject?: string; actor?: string; metadata?: Record<string, unknown>; mode?: string }): Record<string, unknown>;

export declare function createCrewAiToolGuard(args?: Record<string, unknown>): unknown;
export declare function createCrewAiGovernedTool(args: { name: string; description?: string; func?: Function; guard?: unknown; manifest?: unknown; policy?: unknown; subject?: string; actor?: string; metadata?: Record<string, unknown>; mode?: string }): { name: string; description: string; run(input?: Record<string, unknown>, context?: Record<string, unknown>): Promise<unknown> };
export declare function createCrewAiToolSpec(args: { name: string; description?: string; func: Function; guard?: unknown; manifest?: unknown; policy?: unknown; subject?: string; actor?: string; metadata?: Record<string, unknown>; mode?: string }): Record<string, unknown>;

export declare function createMcpClientConfig(args?: Record<string, unknown>): Record<string, unknown>;
export declare class RuleOakMcpLocalClient { constructor(args: { url: string }); callTool(name: string, args?: Record<string, unknown>, id?: unknown): Promise<unknown>; health(): Promise<unknown>; }
export declare function withRuleOakMcpProxy(args: Record<string, unknown>, callback: Function): Promise<unknown>;
export declare function realAdapterManifest(): any;
