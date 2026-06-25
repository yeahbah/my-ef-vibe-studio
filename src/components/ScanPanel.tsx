import { useState } from "react";
import { findingsToReviewItems, formatFindingSummary } from "../lib/scan";
import { runScanJson } from "../lib/schema";
import type { ConnectionSettings } from "../types/connection";
import type { ScanMode, ScanReviewItem } from "../types/scan";

interface ScanPanelProps {
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  onGoToSource: (file: string, line: number) => void;
}

export function ScanPanel({
  connectionSettings,
  searchDirectory,
  onGoToSource,
}: ScanPanelProps) {
  const [items, setItems] = useState<ScanReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [mode, setMode] = useState<ScanMode>("lite");

  const current = items[index];

  async function runScan(nextMode: ScanMode) {
    if (!connectionSettings || !searchDirectory) {
      setError("Set a search directory or EF project before scanning.");
      return;
    }

    setLoading(true);
    setError(undefined);
    setMode(nextMode);

    try {
      const document = await runScanJson(
        connectionSettings,
        searchDirectory,
        searchDirectory,
        nextMode,
      );
      if (!document) {
        setItems([]);
        setError("Scan returned no findings payload.");
        return;
      }

      const reviewItems = findingsToReviewItems(document, nextMode);
      setItems(reviewItems);
      setIndex(0);
      if (reviewItems.length === 0) {
        setError("No findings reported.");
      }
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="sidebar-panel scan-panel">
      <div className="sidebar-header">
        <h3>Scan</h3>
        <div className="scan-actions">
          <button type="button" disabled={loading} onClick={() => void runScan("lite")}>
            Lite
          </button>
          <button type="button" disabled={loading} onClick={() => void runScan("deep")}>
            Deep
          </button>
        </div>
      </div>
      {loading && <p className="muted">Scanning ({mode})…</p>}
      {error && <p className="error-text">{error}</p>}
      {current && (
        <div className="scan-review">
          <div className="scan-nav">
            <button type="button" disabled={index <= 0} onClick={() => setIndex((value) => value - 1)}>
              Prev
            </button>
            <span>
              {index + 1} / {items.length}
            </span>
            <button
              type="button"
              disabled={index >= items.length - 1}
              onClick={() => setIndex((value) => value + 1)}
            >
              Next
            </button>
          </div>
          <p className="scan-summary">{formatFindingSummary(current.finding)}</p>
          <pre className="scan-code">{current.finding.code}</pre>
          {current.finding.recommendation && (
            <p className="muted">{current.finding.recommendation}</p>
          )}
          <button
            type="button"
            onClick={() => onGoToSource(current.finding.filePath, current.finding.line)}
          >
            Open in IDE
          </button>
        </div>
      )}
    </section>
  );
}
