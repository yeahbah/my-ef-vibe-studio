export interface AppUpdateCheckResult {
  currentVersion: string;
  latestVersion?: string;
  updateAvailable: boolean;
  releaseUrl?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  downloadName?: string;
  error?: string;
}
