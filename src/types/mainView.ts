export type AppMainView = "query" | "notebook" | "repl";

export const MAIN_VIEW_LABELS: Record<AppMainView, string> = {
  query: "Query",
  notebook: "Notebook",
  repl: "REPL",
};

export function resolveSavedMainView(session: {
  mainView?: AppMainView;
  notebookOpen?: boolean;
}): AppMainView {
  if (session.mainView) {
    return session.mainView;
  }

  return session.notebookOpen ? "notebook" : "query";
}
