import type { PrerequisiteCheckResult } from "../types/connection";

interface PrerequisitesBannerProps {
  result: PrerequisiteCheckResult | undefined;
  loading: boolean;
}

export function PrerequisitesBanner({ result, loading }: PrerequisitesBannerProps) {
  if (loading) {
    return <div className="banner banner-info">Checking .NET SDK and efvibe…</div>;
  }

  if (!result || result.ok) {
    return null;
  }

  return (
    <div className="banner banner-error">
      <strong>Prerequisites missing.</strong>
      <ul>
        <li>
          {result.dotnet.found
            ? `.NET SDK ${result.dotnet.version}`
            : `.NET SDK not found${result.dotnet.error ? `: ${result.dotnet.error}` : ""}`}
        </li>
        <li>
          {result.efvibe.found
            ? `efvibe ${result.efvibe.version}`
            : `efvibe not found${result.efvibe.error ? `: ${result.efvibe.error}` : ""}`}
        </li>
      </ul>
      <p>Install the .NET SDK and efvibe (`dotnet tool install -g efvibe` or add to dotnet-tools.json).</p>
    </div>
  );
}
