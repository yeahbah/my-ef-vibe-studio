import type { PrerequisiteCheckResult } from "../types/connection";

export function formatPrerequisitesStatus(result: PrerequisiteCheckResult): string {
  const issues: string[] = [];

  if (!result.dotnet.found) {
    issues.push(
      result.dotnet.error ? `.NET SDK not found: ${result.dotnet.error}` : ".NET SDK not found",
    );
  }

  if (!result.efvibe.found) {
    issues.push(
      result.efvibe.error ? `efvibe not found: ${result.efvibe.error}` : "efvibe not found",
    );
  }

  if (issues.length === 0) {
    return "Prerequisites missing.";
  }

  return `Prerequisites missing — ${issues.join("; ")}`;
}
