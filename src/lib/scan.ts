import type { ScanCiOutputDocument, ScanFindingDto, ScanMode, ScanReviewItem } from "../types/scan";

export function findingsToReviewItems(
  document: ScanCiOutputDocument,
  mode: ScanMode,
): ScanReviewItem[] {
  return document.findings.map((finding) => ({
    key: `${finding.filePath}:${finding.line}:${finding.ruleId}`,
    finding,
    scanMode: mode,
  }));
}

export function formatFindingSummary(finding: ScanFindingDto): string {
  const parts = [finding.ruleId, finding.message];
  if (finding.severity) {
    parts.unshift(`[${finding.severity}]`);
  }
  return parts.join(" — ");
}
