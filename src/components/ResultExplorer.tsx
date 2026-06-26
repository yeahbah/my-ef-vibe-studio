import { useEffect, useMemo, useState } from "react";
import { ResultGrid } from "./ResultGrid";
import { buildResultTree, type ResultTreeNode } from "../lib/resultTree";

const PAGE_SIZE = 100;

interface ResultRowsViewProps {
  rows: Array<Record<string, string>>;
  onSave?: (rows: Array<Record<string, string>>) => Promise<void>;
}

export function ResultRowsView({ rows, onSave }: ResultRowsViewProps) {
  const [mode, setMode] = useState<"grid" | "tree">("grid");
  const [draftRows, setDraftRows] = useState(rows);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const rowsKey = useMemo(() => JSON.stringify(rows), [rows]);

  useEffect(() => {
    setDraftRows(rows);
    setIsDirty(false);
    setPage(0);
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

  const pageCount = Math.max(1, Math.ceil(draftRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  const pageRows = draftRows.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  function handleCellChange(rowIndex: number, column: string, value: string) {
    setDraftRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [column]: value } : row)),
    );
    setIsDirty(true);
  }

  function handleDeleteRow(rowIndex: number) {
    setDraftRows((current) => {
      const next = current.filter((_, index) => index !== rowIndex);
      const nextPageCount = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
      setPage((currentPage) => Math.min(currentPage, nextPageCount - 1));
      return next;
    });
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
    setPage(0);
  }

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
            </div>

            <div className="result-view-toolbar-group result-grid-paging">
              <button
                type="button"
                disabled={currentPage <= 0}
                onClick={() => setPage(0)}
                aria-label="First page"
              >
                «
              </button>
              <button
                type="button"
                disabled={currentPage <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="result-grid-page-label">
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                aria-label="Next page"
              >
                ›
              </button>
              <button
                type="button"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(pageCount - 1)}
                aria-label="Last page"
              >
                »
              </button>
              <span className="muted result-grid-row-count">
                {draftRows.length} row{draftRows.length === 1 ? "" : "s"}
              </span>
            </div>
          </>
        ) : null}
      </div>

      {mode === "grid" ? (
        <ResultGrid
          columns={columns}
          rows={pageRows}
          editable
          resetKey={rowsKey}
          rowOffset={currentPage * PAGE_SIZE}
          onCellChange={handleCellChange}
          onDeleteRow={handleDeleteRow}
        />
      ) : (
        draftRows.map((row, index) => (
          <section key={index} className="explorer-row">
            <h4>Row {index + 1}</h4>
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

export function ResultValueView({ value }: { value: string }) {
  const nodes = buildResultTree(value);
  if (nodes.length === 0) {
    return <pre className="value-block">{value}</pre>;
  }

  return (
    <div className="result-explorer">
      <div className="result-view-toolbar">
        <span className="muted result-view-toolbar-label">Tree</span>
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
