import { useMemo, useState } from "react";
import type { SnippetDefinition } from "../types/snippets";
import { BUILTIN_SNIPPETS } from "../types/snippets";

interface SnippetsPanelProps {
  userSnippets: SnippetDefinition[];
  onInsert: (expression: string) => void;
  onAddSnippet: (title: string, expression: string) => void;
  onRemoveSnippet: (id: string) => void;
}

export function SnippetsPanel({
  userSnippets,
  onInsert,
  onAddSnippet,
  onRemoveSnippet,
}: SnippetsPanelProps) {
  const [filter, setFilter] = useState("");
  const [title, setTitle] = useState("");
  const [expression, setExpression] = useState("");

  const snippets = useMemo(() => {
    const all = [...BUILTIN_SNIPPETS, ...userSnippets];
    const needle = filter.trim().toLowerCase();
    if (!needle) {
      return all;
    }

    return all.filter(
      (snippet) =>
        snippet.title.toLowerCase().includes(needle) ||
        snippet.expression.toLowerCase().includes(needle),
    );
  }, [filter, userSnippets]);

  return (
    <section className="sidebar-panel snippets-panel">
      <h3>Snippets</h3>
      <input
        type="search"
        placeholder="Search snippets…"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <ul className="snippet-list">
        {snippets.map((snippet) => (
          <li key={snippet.id}>
            <button type="button" className="snippet-item" onClick={() => onInsert(snippet.expression)}>
              <strong>{snippet.title}</strong>
              {snippet.description ? <span>{snippet.description}</span> : null}
              <code>{snippet.expression}</code>
            </button>
            {!snippet.builtin ? (
              <button type="button" className="snippet-remove" onClick={() => onRemoveSnippet(snippet.id)}>
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <details className="snippet-add">
        <summary>Add snippet</summary>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          placeholder="Expression"
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
        />
        <button
          type="button"
          disabled={!title.trim() || !expression.trim()}
          onClick={() => {
            onAddSnippet(title.trim(), expression.trim());
            setTitle("");
            setExpression("");
          }}
        >
          Save snippet
        </button>
      </details>
    </section>
  );
}
