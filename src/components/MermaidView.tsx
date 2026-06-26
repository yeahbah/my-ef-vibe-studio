import { useEffect, useId, useRef, useState } from "react";
import type { AppTheme } from "../types/theme";

interface MermaidViewProps {
  source: string;
  theme: AppTheme;
  onRendered?: () => void;
}

export function MermaidView({ source, theme, onRendered }: MermaidViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = useId().replace(/:/gu, "");
  const [error, setError] = useState<string>();
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setRendering(true);
    setError(undefined);

    void import("mermaid")
      .then((module) => module.default)
      .then((mermaid) => {
        if (cancelled) {
          return;
        }

        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "strict",
        });

        return mermaid.render(`er-diagram-${renderId}`, source);
      })
      .then((result) => {
        if (!cancelled && result && containerRef.current) {
          containerRef.current.innerHTML = result.svg;
          onRendered?.();
        }
      })
      .catch((failure: unknown) => {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRendering(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onRendered, renderId, source, theme]);

  return (
    <>
      {rendering ? <p className="muted mermaid-status">Rendering diagram…</p> : null}
      {error ? <p className="error-text mermaid-status">{error}</p> : null}
      <div className="mermaid-canvas" ref={containerRef} aria-label="ER diagram" />
    </>
  );
}
