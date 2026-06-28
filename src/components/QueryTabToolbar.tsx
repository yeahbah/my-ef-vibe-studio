import { ConnectionPicker } from "./ConnectionPicker";
import { IconPlay, IconRunLine, IconRunPlan, IconStop } from "./icons";
import type { WorkspaceConnection } from "../types/workspace";

interface QueryTabToolbarProps {
  connections: WorkspaceConnection[];
  connectionId: string;
  onConnectionChange: (connectionId: string) => void;
  running: boolean;
  runAllShortcutLabel: string;
  runLineShortcutLabel: string;
  onRunAll: () => void;
  onRunLine: () => void;
  onRunPlan: () => void;
  onStop: () => void;
}

export function QueryTabToolbar({
  connections,
  connectionId,
  onConnectionChange,
  running,
  runAllShortcutLabel,
  runLineShortcutLabel,
  onRunAll,
  onRunLine,
  onRunPlan,
  onStop,
}: QueryTabToolbarProps) {
  return (
    <div className="query-tab-toolbar">
      <ConnectionPicker
        connections={connections}
        activeConnectionId={connectionId}
        onChange={onConnectionChange}
      />
      <div className="query-tab-run-controls">
        <div className="runbar">
          <button
            type="button"
            className="query-tab-run-btn"
            disabled={running}
            onClick={onRunAll}
            aria-label="Run all"
            title={`Run all (${runAllShortcutLabel})`}
          >
            <IconPlay />
          </button>
          <button
            type="button"
            className="query-tab-run-btn"
            disabled={running}
            onClick={onRunLine}
            aria-label="Run current line"
            title={`Run current line (${runLineShortcutLabel})`}
          >
            <IconRunLine />
          </button>
          <button
            type="button"
            className="query-tab-run-btn"
            disabled={running}
            onClick={onRunPlan}
            aria-label="Run plan"
            title="Run plan"
          >
            <IconRunPlan />
          </button>
        </div>
        <button
          type="button"
          className={running ? "query-tab-stop active" : "query-tab-stop"}
          disabled={!running}
          onClick={onStop}
          aria-label="Stop query"
          title="Stop query"
        >
          <IconStop />
        </button>
      </div>
    </div>
  );
}
