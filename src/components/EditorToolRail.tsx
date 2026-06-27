import { IconBenchmark, IconCharts, IconHistory, IconScan, IconScripts, IconSnippets, IconStar } from "./icons";

export type EditorToolId = "charts" | "history" | "snippets" | "scripts" | "favorites" | "scan";

interface EditorToolRailProps {
  activeTool?: EditorToolId;
  onSelect: (tool: EditorToolId) => void;
  onBenchmark?: () => void;
  benchmarking?: boolean;
  running?: boolean;
}

const TOOLS: Array<{
  id: EditorToolId;
  label: string;
  Icon: typeof IconCharts;
}> = [
  { id: "charts", label: "Charts", Icon: IconCharts },
  { id: "history", label: "History", Icon: IconHistory },
  { id: "snippets", label: "Snippets", Icon: IconSnippets },
  { id: "scripts", label: "Scripts", Icon: IconScripts },
  { id: "favorites", label: "Favorites", Icon: IconStar },
  { id: "scan", label: "Scan", Icon: IconScan },
];

export function EditorToolRail({
  activeTool,
  onSelect,
  onBenchmark,
  benchmarking = false,
  running = false,
}: EditorToolRailProps) {
  return (
    <aside className="editor-tool-rail" role="toolbar" aria-label="Editor tools">
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`editor-tool-btn${activeTool === id ? " active" : ""}`}
          title={label}
          aria-label={label}
          aria-pressed={activeTool === id}
          onClick={() => onSelect(id)}
        >
          <Icon />
        </button>
      ))}
      {onBenchmark ? (
        <button
          type="button"
          className="editor-tool-btn"
          title="Benchmark"
          aria-label="Benchmark"
          disabled={benchmarking || running}
          onClick={onBenchmark}
        >
          <IconBenchmark />
        </button>
      ) : null}
    </aside>
  );
}
