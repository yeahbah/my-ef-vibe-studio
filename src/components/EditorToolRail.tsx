import { IconCharts, IconHistory, IconScan, IconScripts, IconSnippets, IconStar } from "./icons";

export type EditorToolId = "charts" | "history" | "snippets" | "scripts" | "favorites" | "scan";

interface EditorToolRailProps {
  activeTool?: EditorToolId;
  onSelect: (tool: EditorToolId) => void;
}

const TOOLS: Array<{
  id: EditorToolId;
  label: string;
  Icon: typeof IconCharts;
}> = [
  { id: "history", label: "History", Icon: IconHistory },
  { id: "scan", label: "Scan", Icon: IconScan },
  { id: "scripts", label: "Scripts", Icon: IconScripts },
  { id: "favorites", label: "Favorites", Icon: IconStar },
  { id: "snippets", label: "Snippets", Icon: IconSnippets },
  { id: "charts", label: "Charts", Icon: IconCharts },
];

export function EditorToolRail({ activeTool, onSelect }: EditorToolRailProps) {
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
    </aside>
  );
}
