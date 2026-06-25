const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

function sanitizeFolderName(name: string): string {
  const sanitized = name.replace(INVALID_CHARS, "_").trim();
  return sanitized.length > 0 ? sanitized : "project";
}

export function getProjectSessionFolderName(projectCsprojPath: string): string {
  const base = projectCsprojPath.split(/[/\\]/).pop()?.replace(/\.csproj$/i, "") ?? "project";
  return sanitizeFolderName(base);
}

export function getDbContextSessionFolderName(dbContextName: string): string {
  return sanitizeFolderName(dbContextName || "DbContext");
}

export function getProjectScanDirectory(workspaceRoot: string, projectCsprojPath: string): string {
  return `${workspaceRoot.replace(/\/$/, "")}/${getProjectSessionFolderName(projectCsprojPath)}/scan`;
}

export function getDbContextSessionDirectory(
  workspaceRoot: string,
  projectCsprojPath: string,
  dbContextName: string,
): string {
  const projectFolder = getProjectSessionFolderName(projectCsprojPath);
  const contextFolder = getDbContextSessionFolderName(dbContextName);
  return `${workspaceRoot.replace(/\/$/, "")}/${projectFolder}/${contextFolder}`;
}

export const LITE_SCAN_FILE_NAME = "myefvibe-scan-lite.json";
export const DEEP_SCAN_FILE_NAME = "myefvibe-scan-deep.json";

export function getLiteScanFilePath(workspaceRoot: string, projectCsprojPath: string): string {
  return `${getProjectScanDirectory(workspaceRoot, projectCsprojPath)}/${LITE_SCAN_FILE_NAME}`;
}

export function getDeepScanFilePath(
  workspaceRoot: string,
  projectCsprojPath: string,
  dbContextName: string,
): string {
  return `${getDbContextSessionDirectory(workspaceRoot, projectCsprojPath, dbContextName)}/${DEEP_SCAN_FILE_NAME}`;
}
