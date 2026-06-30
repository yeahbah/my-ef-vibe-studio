import { useEffect, useMemo, useState } from "react";
import { ResultGrid } from "./ResultGrid";
import { buildResultTree, type ResultTreeNode } from "../lib/resultTree";
import { shouldRenderStructuredScalar } from "../lib/consoleOutput";

export interface ResultRowsPaging {
  pageIndex: number;
  pageSize: number;
  hasMore: boolean;
  loading?: boolean;
  onPageChange: (pageIndex: number) => void;
}

interface ResultRowsViewProps {
  rows: Array<Record<string, string>>;
  paging?: ResultRowsPaging;
  onSave?: (rows: Array<Record<string, string>>) => Promise<void>;
  exportEnabled?: boolean;
  onExport?: (format: "csv" | "json") => void;
}

export function ResultRowsView({
  rows,
  paging,
  onSave,
  exportEnabled = false,
  onExport,
}: ResultRowsViewProps) {
  const [mode, setMode] = useState<"grid" | "tree">("grid");
  const [draftRows, setDraftRows] = useState(rows);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const rowsKey = useMemo(() => JSON.stringify(rows), [rows]);

  useEffect(() => {
    setDraftRows(rows);
    setIsDirty(false);
  }, [rowsKey, rows]);

  const columns = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const row of draftRows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          ordered.push(key);
        }
      }
    }

    return ordered;
  }, [draftRows]);

  function handleCellChange(rowIndex: number, column: string, value: string) {
    setDraftRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [column]: value } : row)),
    );
    setIsDirty(true);
  }

  function handleDeleteRow(rowIndex: number) {
    setDraftRows((current) => current.filter((_, index) => index !== rowIndex));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!onSave) {
      return;
    }

    setSaving(true);
    try {
      await onSave(draftRows);
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraftRows(rows);
    setIsDirty(false);
  }

  const exportButtons =
    exportEnabled && onExport ? (
      <>
        <button type="button" onClick={() => onExport("csv")}>
          CSV
        </button>
        <button type="button" onClick={() => onExport("json")}>
          JSON
        </button>
      </>
    ) : null;

  const pageIndex = paging?.pageIndex ?? 0;
  const rowOffset = pageIndex * (paging?.pageSize ?? draftRows.length);

  return (
    <div className="result-explorer">
      <div className="result-view-toolbar">
        <div className="result-view-toolbar-group">
          <button
            type="button"
            className={mode === "grid" ? "active" : ""}
            onClick={() => setMode("grid")}
          >
            Grid
          </button>
          <button
            type="button"
            className={mode === "tree" ? "active" : ""}
            onClick={() => setMode("tree")}
          >
            Tree
          </button>
        </div>

        {mode === "grid" ? (
          <>
            <div className="result-view-toolbar-group">
              <button type="button" disabled={!isDirty || saving} onClick={() => void handleSave()}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" disabled={!isDirty || saving} onClick={handleCancel}>
                Cancel
              </button>
              {exportButtons}
            </div>

            {paging ? (
              <div className="result-view-toolbar-group result-grid-paging">
                <button
                  type="button"
                  disabled={paging.loading || pageIndex <= 0}
                  onClick={() => paging.onPageChange(0)}
                  aria-label="First page"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={paging.loading || pageIndex <= 0}
                  onClick={() => paging.onPageChange(pageIndex - 1)}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <span className="result-grid-page-label">
                  Page {pageIndex + 1}
                  {paging.loading ? " · loading…" : ""}
                </span>
                <button
                  type="button"
                  disabled={paging.loading || !paging.hasMore}
                  onClick={() => paging.onPageChange(pageIndex + 1)}
                  aria-label="Next page"
                >
                  ›
                </button>
                <span className="muted result-grid-row-count">
                  {draftRows.length} row{draftRows.length === 1 ? "" : "s"} on this page
                </span>
              </div>
            ) : null}
          </>
        ) : exportButtons ? (
          <div className="result-view-toolbar-group">{exportButtons}</div>
        ) : null}
      </div>

      {mode === "grid" ? (
        <ResultGrid
          columns={columns}
          rows={draftRows}
          editable
          resetKey={rowsKey}
          rowOffset={rowOffset}
          onCellChange={handleCellChange}
          onDeleteRow={handleDeleteRow}
        />
      ) : (
        draftRows.map((row, index) => (
          <section key={index} className="explorer-row">
            <h4>Row {rowOffset + index + 1}</h4>
            {Object.entries(row).map(([key, value]) => {
              const nodes = buildResultTree(value);
              if (nodes.length === 1 && nodes[0].children.length > 0) {
                return (
                  <TreeNode
                    key={key}
                    node={{ key, value: "", children: nodes[0].children }}
                    depth={0}
                  />
                );
              }

              return <TreeNode key={key} node={{ key, value, children: [] }} depth={0} />;
            })}
          </section>
        ))
      )}
    </div>
  );
}

export function ConsoleOutputView({ output }: { output: string }) {
  return (
    <section className="console-output-panel" aria-label="Program output">
      <header className="console-output-header">Output</header>
      <pre className="console-output">{output}</pre>
    </section>
  );
}

export function ReturnValueSummary({ value }: { value: string }) {
  return (
    <section className="return-value-panel" aria-label="Return value">
      <header className="return-value-header">Return value</header>
      <ResultValueView value={value} />
    </section>
  );
}

export function ResultValueView({
  value,
  exportEnabled = false,
  onExport,
}: {
  value: string;
  exportEnabled?: boolean;
  onExport?: (format: "csv" | "json") => void;
}) {
  const exportButtons =
    exportEnabled && onExport ? (
      <>
        <button type="button" onClick={() => onExport("csv")}>
          CSV
        </button>
        <button type="button" onClick={() => onExport("json")}>
          JSON
        </button>
      </>
    ) : null;

  if (!shouldRenderStructuredScalar(value)) {
    return (
      <div className="result-explorer">
        {exportButtons ? (
          <div className="result-view-toolbar">
            <div className="result-view-toolbar-group">{exportButtons}</div>
          </div>
        ) : null}
        <pre className="value-block console-output">{value}</pre>
      </div>
    );
  }

  const nodes = buildResultTree(value);

  if (nodes.length === 0) {
    return (
      <div className="result-explorer">
        {exportButtons ? (
          <div className="result-view-toolbar">
            <div className="result-view-toolbar-group">{exportButtons}</div>
          </div>
        ) : null}
        <pre className="value-block">{value}</pre>
      </div>
    );
  }

  if (nodes.length === 1 && nodes[0].key === "value" && nodes[0].children.length === 0) {
    return (
      <div className="result-explorer">
        {exportButtons ? (
          <div className="result-view-toolbar">
            <div className="result-view-toolbar-group">{exportButtons}</div>
          </div>
        ) : null}
        <pre className="value-block">{value}</pre>
      </div>
    );
  }

  return (
    <div className="result-explorer">
      <div className="result-view-toolbar">
        <span className="muted result-view-toolbar-label">Tree</span>
        {exportButtons ? <div className="result-view-toolbar-group">{exportButtons}</div> : null}
      </div>
      {nodes.map((node, index) => (
        <TreeNode key={`${node.key}-${index}`} node={node} depth={0} defaultOpen />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  defaultOpen = false,
}: {
  node: ResultTreeNode;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div className="tree-node" style={{ marginLeft: depth * 14 }}>
      <button
        type="button"
        className="tree-node-label"
        onClick={() => hasChildren && setOpen((current) => !current)}
        disabled={!hasChildren}
      >
        <span className="tree-chevron">{hasChildren ? (open ? "▾" : "▸") : "·"}</span>
        <span className="tree-key">{node.key}</span>
        {node.value ? <span className="tree-value"> = {node.value}</span> : null}
      </button>
      {open &&
        node.children.map((child, index) => (
          <TreeNode key={`${child.key}-${index}`} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}
