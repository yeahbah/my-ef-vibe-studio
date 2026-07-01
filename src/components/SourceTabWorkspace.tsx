import { SourceFileView } from "./SourceFileView";
import type { AppTheme } from "../types/theme";

interface SourceTabWorkspaceProps {
  filePath: string;
  line: number;
  theme: AppTheme;
}

export function SourceTabWorkspace({ filePath, line, theme }: SourceTabWorkspaceProps) {
  return (
    <div className="source-tab-workspace">
      <header className="source-tab-workspace-header">
        <span className="source-tab-workspace-path muted" title={filePath}>
          {filePath}:{line}
        </span>
      </header>
      <SourceFileView
        filePath={filePath}
        line={line}
        theme={theme}
        fill
        showHeader={false}
      />
    </div>
  );
}
