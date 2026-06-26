import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { dispatchRunPlan, dispatchRunQuery } from "../lib/editorRun";
import { matchesKeybinding, resolveKeybindings } from "../lib/keybindings";
import { EditorWorkspace } from "./EditorWorkspace";
import { LiveSqlPane } from "./LiveSqlPane";
import { MonacoEditor, type MonacoEditorHandle } from "./MonacoEditor";
import type { ConnectionSettings } from "../types/connection";
import type { KeybindingSettings } from "../types/keybindings";
import type { AppTheme } from "../types/theme";

export interface QueryWorkspaceHandle {
  getDraft: () => string;
  getRunText: () => string;
  flush: () => void;
}

interface QueryWorkspaceProps {
  tabId: string;
  expression: string;
  theme: AppTheme;
  onExpressionChange: (tabId: string, expression: string) => void;
  sqlPaneOpen: boolean;
  onSqlPaneOpenChange: (open: boolean) => void;
  sqlPaneWidth: number;
  onSqlPaneWidthChange: (width: number) => void;
  connectionSettings: ConnectionSettings | undefined;
  searchDirectory: string;
  autoPreviewAllowed: boolean;
  running: boolean;
  onRequestEngine?: () => void;
  onEngineBusyChange?: (delta: number) => void;
  onRun: (text: string) => void;
  keybindings?: KeybindingSettings;
}

const EXPRESSION_SYNC_MS = 400;

export const QueryWorkspace = forwardRef<QueryWorkspaceHandle, QueryWorkspaceProps>(
  function QueryWorkspace(
    {
      tabId,
      expression,
      theme,
      onExpressionChange,
      sqlPaneOpen,
      onSqlPaneOpenChange,
      sqlPaneWidth,
      onSqlPaneWidthChange,
      connectionSettings,
      searchDirectory,
      autoPreviewAllowed,
      running,
      onRequestEngine,
      onEngineBusyChange,
      onRun,
      keybindings,
    },
    ref,
  ) {
    const [draft, setDraft] = useState(expression);
    const draftRef = useRef(expression);
    const editorRef = useRef<MonacoEditorHandle>(null);
    const workspaceRef = useRef<HTMLDivElement>(null);
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const resolvedKeybindings = resolveKeybindings(keybindings);

    useEffect(() => {
      setDraft(expression);
      draftRef.current = expression;
    }, [tabId, expression]);

    useEffect(() => {
      if (!sqlPaneOpen) {
        editorRef.current?.focus();
      }
    }, [sqlPaneOpen]);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        const target = event.target;
        if (!(target instanceof Node) || !workspaceRef.current?.contains(target)) {
          return;
        }

        if (matchesKeybinding(event, resolvedKeybindings.runQuery)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          dispatchRunQuery("");
          return;
        }

        if (matchesKeybinding(event, resolvedKeybindings.runPlan)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          dispatchRunPlan("");
        }
      };

      window.addEventListener("keydown", onKeyDown, true);
      return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [resolvedKeybindings.runPlan, resolvedKeybindings.runQuery]);

    const flushDraft = useCallback(
      (tabIdToFlush: string, value: string) => {
        if (syncTimerRef.current) {
          clearTimeout(syncTimerRef.current);
          syncTimerRef.current = undefined;
        }

        onExpressionChange(tabIdToFlush, value);
      },
      [onExpressionChange],
    );

    useImperativeHandle(
      ref,
      () => ({
        getDraft: () => draftRef.current,
        getRunText: () => editorRef.current?.getRunText() ?? draftRef.current.trim(),
        flush: () => flushDraft(tabId, draftRef.current),
      }),
      [flushDraft, tabId],
    );

    useEffect(() => {
      return () => {
        flushDraft(tabId, draftRef.current);
      };
    }, [flushDraft, tabId]);

    const scheduleSync = useCallback(
      (value: string) => {
        if (syncTimerRef.current) {
          clearTimeout(syncTimerRef.current);
        }

        syncTimerRef.current = setTimeout(() => {
          syncTimerRef.current = undefined;
          onExpressionChange(tabId, value);
        }, EXPRESSION_SYNC_MS);
      },
      [onExpressionChange, tabId],
    );

    const handleChange = useCallback(
      (value: string) => {
        draftRef.current = value;
        setDraft(value);
        scheduleSync(value);
      },
      [scheduleSync],
    );

    return (
      <EditorWorkspace
        ref={workspaceRef}
        sqlPaneOpen={sqlPaneOpen}
        onSqlPaneOpenChange={onSqlPaneOpenChange}
        sqlPaneWidth={sqlPaneWidth}
        onSqlPaneWidthChange={onSqlPaneWidthChange}
        editor={
          <MonacoEditor
            ref={editorRef}
            value={draft}
            theme={theme}
            onChange={handleChange}
            keybindings={keybindings}
            enableRunShortcuts={false}
          />
        }
        sqlPane={
          <LiveSqlPane
            expression={draft}
            connectionSettings={connectionSettings}
            searchDirectory={searchDirectory}
            enabled
            autoPreviewAllowed={autoPreviewAllowed}
            running={running}
            onRequestEngine={onRequestEngine}
            onEngineBusyChange={onEngineBusyChange}
            onRun={onRun}
            theme={theme}
            keybindings={keybindings}
          />
        }
      />
    );
  },
);
