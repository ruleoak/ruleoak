export const PROTOCOL_CONFORMANCE_KIT: Readonly<{
  name: string;
  kitVersion: string;
  protocol: string;
  latestPublicCoreRelease: string;
  status: string;
}>;

export function runProtocolConformanceKit(options?: { kitRoot?: string }): {
  valid: boolean;
  errors: string[];
  kitRoot: string;
  protocol?: string;
  kitVersion?: string;
  latestPublicCoreRelease?: string;
  goldenRecordCount?: number;
  checks?: string[];
};
