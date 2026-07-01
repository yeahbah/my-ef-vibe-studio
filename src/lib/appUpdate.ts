import { invoke } from "@tauri-apps/api/core";
import type { AppUpdateCheckResult } from "../types/appUpdate";

export async function checkAppUpdate(): Promise<AppUpdateCheckResult> {
  return invoke<AppUpdateCheckResult>("check_app_update");
}

export async function downloadAndInstallAppUpdate(
  downloadUrl: string,
  fileName: string,
): Promise<string> {
  return invoke<string>("download_and_install_app_update", {
    downloadUrl,
    fileName,
  });
}
