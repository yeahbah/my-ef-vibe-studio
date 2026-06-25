import { useState } from "react";
import { ResultGrid } from "./ResultGrid";
import { buildResultTree, type ResultTreeNode } from "../lib/resultTree";

export function ResultRowsView({ rows }: { rows: Array<Record<string, string>> }) {
  const [mode, setMode] = useState<"grid" | "tree">("grid");
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  return (
    <div className="result-explorer">
      <div className="result-view-toolbar">
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
        <ResultGrid columns={columns} rows={rows} />
      ) : (
        rows.map((row, index) => (
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
