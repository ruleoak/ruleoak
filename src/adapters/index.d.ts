export declare function createLangGraphToolGuard(args?: Record<string, unknown>): unknown;
export declare function wrapLangGraphTool(args: { name: string; tool: Function; guard: unknown; subject?: string; metadata?: Record<string, unknown> }): Function;
export declare function createCrewAiToolGuard(args?: Record<string, unknown>): unknown;
export declare function createCrewAiGovernedTool(args: { name: string; description?: string; func: Function; guard: unknown; subject?: string; metadata?: Record<string, unknown> }): { name: string; description: string; run(input?: Record<string, unknown>, context?: Record<string, unknown>): Promise<unknown> };
