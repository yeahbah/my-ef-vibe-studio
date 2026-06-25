import { useCallback, useEffect, useState } from "react";
import { commitGitFiles, fetchGitStatus, type GitStatusResult } from "../lib/gitClient";
import {
  exportTeamPack,
  importTeamPack,
  readPackFromSyncDirectory,
  writePackToSyncDirectory,
  buildPackFromStudio,
  applyImportedPack,
} from "../lib/pack";
import type { QueryTab } from "../types/query";
import type { QueryLibraryState } from "../types/queryLibrary";
import { BUILTIN_SNIPPET_PACKS, type SnippetPackManifest } from "../types/snippetPacks";
import type { SnippetDefinition } from "../types/snippets";
import type { PreferredEditor } from "../types/connection";

interface TeamPanelProps {
  workspaceDirectory: string;
  workspacePath: string;
  queryTabs: QueryTab[];
  userSnippets: SnippetDefinition[];
  queryLibrary: QueryLibraryState;
  teamSyncDirectory: string;
  preferredEditor: PreferredEditor;
  installedPackIds: string[];
  onImportPack: (snippets: SnippetDefinition[], queries: Array<{ name: string; expression: string; connectionId: string }>, folderNames: string[]) => void;
  onInstallPackId: (packId: string) => void;
  onStatus: (message: string) => void;
}

const EDITOR_LABELS: Record<PreferredEditor, string> = {
  code: "VS Code",
  rider: "Rider",
  devenv: "Visual Studio",
  custom: "IDE",
};

export function TeamPanel({
  workspaceDirectory,
  workspacePath,
  queryTabs,
  userSnippets,
  queryLibrary,
  teamSyncDirectory,
  preferredEditor,
  installedPackIds,
  onImportPack,
  onInstallPackId,
  onStatus,
}: TeamPanelProps) {
  const [gitStatus, setGitStatus] = useState<GitStatusResult | undefined>();
  const [gitLoading, setGitLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Update efvibe queries");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [committing, setCommitting] = useState(false);

  const gitDirectory = workspaceDirectory && workspaceDirectory !== "." ? workspaceDirectory : teamSyncDirectory || ".";

  const refreshGit = useCallback(async () => {
    setGitLoading(true);
    try {
      const status = await fetchGitStatus(gitDirectory);
      setGitStatus(status);

      const tabFiles = queryTabs
        .map((tab) => tab.filePath)
        .filter((path): path is string => Boolean(path));
      const workspaceFile = workspacePath ? [workspacePath] : [];
      const available = [
        ...new Set([
          ...status.dirtyFiles,
          ...status.untrackedFiles,
          ...tabFiles,
          ...workspaceFile,
        ]),
      ];

      setSelectedFiles((current) => {
        const retained = current.filter((file) => available.includes(file));
        return retained.length > 0 ? retained : available;
      });
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setGitLoading(false);
    }
  }, [gitDirectory, onStatus, queryTabs, workspacePath]);

  useEffect(() => {
    void refreshGit();
  }, [gitDirectory]);

  async function handleCommit() {
    if (selectedFiles.length === 0) {
      onStatus("Select at least one file to commit.");
      return;
    }

    setCommitting(true);
    try {
      const result = await commitGitFiles(gitDirectory, commitMessage, selectedFiles);
      onStatus(result.committed ? "Committed efvibe files." : result.output);
      await refreshGit();
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setCommitting(false);
    }
  }

  async function handleExportPack() {
    try {
      const path = await exportTeamPack(
        "team-pack",
        queryTabs,
        userSnippets,
        queryLibrary,
      );
      if (path) {
        onStatus(`Exported pack to ${path}`);
      }
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleImportPack() {
    try {
      const pack = await importTeamPack();
      if (!pack) {
        return;
      }

      const applied = applyImportedPack(pack, queryTabs[0]?.connectionId ?? "");
      onImportPack(applied.snippets, applied.queries, applied.folderNames);
      onStatus(`Imported pack ${pack.name}`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSyncPush() {
    if (!teamSyncDirectory.trim()) {
      onStatus("Set a team sync directory in Settings first.");
      return;
    }

    try {
      const pack = buildPackFromStudio(
        "team-sync",
        queryTabs,
        userSnippets,
        queryLibrary,
      );
      const path = await writePackToSyncDirectory(teamSyncDirectory, pack);
      onStatus(`Pushed favorites to ${path}`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSyncPull() {
    if (!teamSyncDirectory.trim()) {
      onStatus("Set a team sync directory in Settings first.");
      return;
    }

    try {
      const pack = await readPackFromSyncDirectory(teamSyncDirectory);
      if (!pack) {
        onStatus("No team-pack.efvibe-pack found in sync directory.");
        return;
      }

      const applied = applyImportedPack(pack, queryTabs[0]?.connectionId ?? "");
      onImportPack(applied.snippets, applied.queries, applied.folderNames);
      onStatus(`Pulled pack ${pack.name} from sync directory.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function installBuiltinPack(manifest: SnippetPackManifest) {
    const applied = applyImportedPack(manifest.pack, queryTabs[0]?.connectionId ?? "");
    onImportPack(applied.snippets, applied.queries, applied.folderNames);
    onInstallPackId(manifest.id);
    onStatus(`Installed snippet pack: ${manifest.name}`);
  }

  function toggleFile(file: string) {
    setSelectedFiles((current) =>
      current.includes(file) ? current.filter((entry) => entry !== file) : [...current, file],
    );
  }

  const studioFiles = [
    ...new Set([
      ...(gitStatus?.dirtyFiles ?? []),
      ...(gitStatus?.untrackedFiles ?? []),
      ...queryTabs.map((tab) => tab.filePath).filter((path): path is string => Boolean(path)),
      ...(workspacePath ? [workspacePath] : []),
    ]),
  ];

  return (
    <section className="sidebar-panel team-panel">
      <h3>Team & Git</h3>
      <p className="muted">
        Share queries with git and team packs. Scan findings open in {EDITOR_LABELS[preferredEditor]}.
      </p>

      <div className="team-section">
        <div className="sidebar-header">
          <h4>Git</h4>
          <button type="button" disabled={gitLoading} onClick={() => void refreshGit()}>
            Refresh
          </button>
        </div>
        {!gitStatus?.isRepo ? (
          <p className="muted">No git repository detected in {gitDirectory}.</p>
        ) : (
          <>
            <p className="muted">Branch: {gitStatus.branch ?? "detached"}</p>
            {studioFiles.length === 0 ? (
              <p className="muted">No efvibe workspace/query/notebook files changed.</p>
            ) : (
              <ul className="git-file-list">
                {studioFiles.map((file) => (
                  <li key={file}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file)}
                        onChange={() => toggleFile(file)}
                      />
                      {file}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="text"
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="Commit message"
            />
            <button type="button" disabled={committing} onClick={() => void handleCommit()}>
              Commit selected
            </button>
          </>
        )}
      </div>

      <div className="team-section">
        <h4>Team packs</h4>
        <div className="team-actions">
          <button type="button" onClick={() => void handleExportPack()}>
            Export pack
          </button>
          <button type="button" onClick={() => void handleImportPack()}>
            Import pack
          </button>
        </div>
      </div>

      <div className="team-section">
        <h4>Sync folder</h4>
        <p className="muted">
          {teamSyncDirectory
            ? `Sync directory: ${teamSyncDirectory}`
            : "Configure a shared folder in Settings for team query sync."}
        </p>
        <div className="team-actions">
          <button type="button" onClick={() => void handleSyncPush()}>
            Push favorites
          </button>
          <button type="button" onClick={() => void handleSyncPull()}>
            Pull pack
          </button>
        </div>
      </div>

      <div className="team-section">
        <h4>Snippet packs</h4>
        <ul className="pack-list">
          {BUILTIN_SNIPPET_PACKS.map((manifest) => (
            <li key={manifest.id}>
              <div className="pack-card">
                <strong>{manifest.name}</strong>
                <span>{manifest.description}</span>
                <button
                  type="button"
                  disabled={installedPackIds.includes(manifest.id)}
                  onClick={() => installBuiltinPack(manifest)}
                >
                  {installedPackIds.includes(manifest.id) ? "Installed" : "Install"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
