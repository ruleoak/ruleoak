export function reportToOtelEvents(report: Record<string, unknown>, args?: { source?: string; serviceName?: string }): Record<string, unknown>[];
export function exportReportsToOtel(args?: { reportPaths?: string[]; outputJsonl?: string; outputJson?: string }): Record<string, unknown>[];
