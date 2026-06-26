import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import { spawn } from "tauri-pty";
import { replSpawnKey, type ReplSpawnSpec } from "../lib/replTerminal";
import { xtermTheme } from "../lib/theme";
import type { AppTheme } from "../types/theme";
import "@xterm/xterm/css/xterm.css";

interface EmbeddedTerminalProps {
  spawnSpec: ReplSpawnSpec | null;
  theme: AppTheme;
  className?: string;
  active?: boolean;
  onExit?: (exitCode: number) => void;
}

export function EmbeddedTerminal({
  spawnSpec,
  theme,
  className,
  active = true,
  onExit,
}: EmbeddedTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onExitRef = useRef(onExit);
  const fitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const scheduleFit = () => {
      window.requestAnimationFrame(() => {
        fitRef.current?.();
        window.requestAnimationFrame(() => {
          fitRef.current?.();
        });
      });
    };

    scheduleFit();
    const timeoutId = window.setTimeout(scheduleFit, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [active, spawnSpec ? replSpawnKey(spawnSpec) : ""]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !spawnSpec) {
      return;
    }

    let disposed = false;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      theme: xtermTheme(theme),
      scrollback: 5000,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);

    const fit = () => {
      if (disposed) {
        return;
      }

      fitAddon.fit();
      pty?.resize(term.cols, term.rows);
    };

    fitRef.current = fit;

    let pty: ReturnType<typeof spawn> | undefined;
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(fit);
    });

    resizeObserver.observe(container);
    window.addEventListener("resize", fit);

    try {
      pty = spawn(spawnSpec.program, spawnSpec.args, {
        cols: term.cols,
        rows: term.rows,
        cwd: spawnSpec.cwd,
        env: {
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      term.writeln(`Failed to start REPL: ${message}`);
      fitAddon.fit();
      return () => {
        disposed = true;
        fitRef.current = null;
        resizeObserver.disconnect();
        window.removeEventListener("resize", fit);
        term.dispose();
      };
    }

    const dataDisposable = pty.onData((data) => {
      term.write(data);
    });
    const inputDisposable = term.onData((data) => {
      pty?.write(data);
    });
    const exitDisposable = pty.onExit(({ exitCode }) => {
      term.writeln("");
      term.writeln(`[efvibe REPL exited with code ${exitCode}]`);
      onExitRef.current?.(exitCode);
    });

    fitAddon.fit();
    pty.resize(term.cols, term.rows);

    return () => {
      disposed = true;
      fitRef.current = null;
      dataDisposable.dispose();
      inputDisposable.dispose();
      exitDisposable.dispose();
      resizeObserver.disconnect();
      window.removeEventListener("resize", fit);
      pty?.kill();
      term.dispose();
    };
  }, [spawnSpec ? replSpawnKey(spawnSpec) : "", theme]);

  return (
    <div className={className ? `embedded-terminal ${className}` : "embedded-terminal"}>
      {spawnSpec ? (
        <div ref={containerRef} className="embedded-terminal-host" />
      ) : (
        <p className="muted embedded-terminal-empty">Configure a connection to start the REPL.</p>
      )}
    </div>
  );
}
