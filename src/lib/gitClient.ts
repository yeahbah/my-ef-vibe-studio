import { invoke } from "@tauri-apps/api/core";

export interface GitStatusResult {
  isRepo: boolean;
  branch?: string;
  dirtyFiles: string[];
  untrackedFiles: string[];
  error?: string;
}

export interface GitCommitResult {
  committed: boolean;
  output: string;
}

export async function fetchGitStatus(directory: string): Promise<GitStatusResult> {
  return invoke<GitStatusResult>("git_status", { directory });
}

export async function commitGitFiles(
  directory: string,
  message: string,
  files: string[],
): Promise<GitCommitResult> {
  return invoke<GitCommitResult>("git_commit_files", { directory, message, files });
}
