import { useEffect, useMemo, useState } from "react";
import { formatWorkspaceJson, parseWorkspaceFromJson } from "../lib/workspace";
import type { EfvibeWorkspace } from "../types/workspace";

interface WorkspacePropertiesDialogProps {
  open: boolean;
  workspace: EfvibeWorkspace;
  documentPath: string;
  onClose: () => void;
  onApply: (workspace: EfvibeWorkspace) => void;
}

export function WorkspacePropertiesDialog({
  open,
  workspace,
  documentPath,
  onClose,
  onApply,
}: WorkspacePropertiesDialogProps) {
  const formattedWorkspace = useMemo(() => formatWorkspaceJson(workspace), [workspace]);
  const [jsonText, setJsonText] = useState(formattedWorkspace);
  const [parseError, setParseError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setJsonText(formattedWorkspace);
      setParseError(undefined);
    }
  }, [open, formattedWorkspace]);

  if (!open) {
    return null;
  }

  function handleApply() {
    try {
      const nextWorkspace = parseWorkspaceFromJson(jsonText);
      setParseError(undefined);
      onApply(nextWorkspace);
      onClose();
    } catch (error) {
      setParseError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="charts-overlay" onClick={onClose}>
      <section className="workspace-properties-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="charts-header">
          <h2>Workspace properties</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <dl className="workspace-properties-summary">
          <div>
            <dt>Name</dt>
            <dd>{workspace.name}</dd>
          </div>
          <div>
            <dt>File</dt>
            <dd>{documentPath || "Unsaved workspace"}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{workspace.version}</dd>
          </div>
          <div>
            <dt>Connections</dt>
            <dd>{workspace.connections.length}</dd>
          </div>
          <div>
            <dt>Projects</dt>
            <dd>{workspace.projects.length}</dd>
          </div>
        </dl>

        <label className="field-label workspace-properties-json">
          <span>Workspace JSON</span>
          <textarea
            value={jsonText}
            onChange={(event) => {
              setJsonText(event.target.value);
              if (parseError) {
                setParseError(undefined);
              }
            }}
            rows={18}
            spellCheck={false}
          />
        </label>

        {parseError ? <p className="error-text">{parseError}</p> : null}

        <div className="dialog-actions">
          <button type="button" onClick={handleApply}>
            Apply
          </button>
        </div>
      </section>
    </div>
  );
}
