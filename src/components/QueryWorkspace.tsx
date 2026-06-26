import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { EditorWorkspace } from "./EditorWorkspace";
import { LiveSqlPane } from "./LiveSqlPane";
import { MonacoEditor } from "./MonacoEditor";
import type { ConnectionSettings } from "../types/connection";
import type { KeybindingSettings } from "../types/keybindings";
import type { AppTheme } from "../types/theme";

export interface QueryWorkspaceHandle {
  getDraft: () => string;
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
  onRunSql: (sql: string) => void;
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
      onRunSql,
      keybindings,
    },
    ref,
  ) {
    const [draft, setDraft] = useState(expression);
    const draftRef = useRef(expression);
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
      setDraft(expression);
      draftRef.current = expression;
    }, [tabId, expression]);

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
        sqlPaneOpen={sqlPaneOpen}
        onSqlPaneOpenChange={onSqlPaneOpenChange}
        sqlPaneWidth={sqlPaneWidth}
        onSqlPaneWidthChange={onSqlPaneWidthChange}
        editor={<MonacoEditor value={draft} theme={theme} onChange={handleChange} keybindings={keybindings} />}
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
            onRunSql={onRunSql}
          />
        }
      />
    );
  },
);
