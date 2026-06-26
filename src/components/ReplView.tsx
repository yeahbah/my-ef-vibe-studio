import { useEffect, useState } from "react";
import { fetchReplSpawnSpec, type ReplSpawnSpec } from "../lib/replTerminal";
import type { ConnectionSettings } from "../types/connection";
import type { AppTheme } from "../types/theme";
import { EmbeddedTerminal } from "./EmbeddedTerminal";

interface ReplViewProps {
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  theme: AppTheme;
  onStatus: (message: string) => void;
  onOpenExternalTerminal: () => void;
  onSessionExit?: (exitCode: number) => void;
}

export function ReplView({
  connectionSettings,
  searchDirectory,
  theme,
  onStatus,
  onOpenExternalTerminal,
  onSessionExit,
}: ReplViewProps) {
  const [spawnSpec, setSpawnSpec] = useState<ReplSpawnSpec | null>(null);
  const [spawnError, setSpawnError] = useState<string | undefined>();

  useEffect(() => {
    if (!connectionSettings || !searchDirectory) {
      setSpawnSpec(null);
      setSpawnError(undefined);
      return;
    }

    let cancelled = false;
    void fetchReplSpawnSpec(connectionSettings, searchDirectory, searchDirectory)
      .then((spec) => {
        if (!cancelled) {
          setSpawnSpec(spec);
          setSpawnError(undefined);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSpawnSpec(null);
          const message = error instanceof Error ? error.message : String(error);
          setSpawnError(message);
          onStatus(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connectionSettings, onStatus, searchDirectory]);

  return (
    <section className="main-view repl-view" aria-label="REPL">
      <header className="repl-view-header">
        <div>
          <h2>REPL</h2>
          <p className="muted repl-view-subtitle">
            Interactive efvibe session for the active connection.
          </p>
        </div>
        <button type="button" onClick={onOpenExternalTerminal}>
          Open external terminal
        </button>
      </header>

      {spawnError ? <p className="error-text repl-view-error">{spawnError}</p> : null}

      <EmbeddedTerminal
        spawnSpec={spawnSpec}
        theme={theme}
        className="repl-view-terminal"
        onExit={onSessionExit}
      />
    </section>
  );
}
