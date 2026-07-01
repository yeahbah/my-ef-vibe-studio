use crate::efvibe_version::{is_version_newer, parse_efvibe_version};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

const GITHUB_RELEASES_LATEST: &str =
    "https://api.github.com/repos/yeahbah/my-ef-vibe-studio/releases/latest";
const USER_AGENT: &str = "MyEFvibe-Studio-Updater";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateCheckResult {
    pub current_version: String,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub release_url: Option<String>,
    pub release_notes: Option<String>,
    pub download_url: Option<String>,
    pub download_name: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    html_url: String,
    body: Option<String>,
    assets: Vec<GithubReleaseAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubReleaseAsset {
    name: String,
    browser_download_url: String,
}

pub fn check_app_update(current_version: &str) -> AppUpdateCheckResult {
    let mut result = AppUpdateCheckResult {
        current_version: current_version.to_string(),
        latest_version: None,
        update_available: false,
        release_url: None,
        release_notes: None,
        download_url: None,
        download_name: None,
        error: None,
    };

    if let Some(error) = platform_update_error() {
        result.error = Some(error);
        return result;
    }

    let release = match fetch_latest_release() {
        Ok(release) => release,
        Err(error) => {
            result.error = Some(error);
            return result;
        }
    };

    let latest_version = normalize_release_tag(&release.tag_name);
    result.latest_version = Some(latest_version.clone());
    result.release_url = Some(release.html_url);
    result.release_notes = release.body.filter(|body| !body.trim().is_empty());

    match select_release_asset(&release.assets) {
        Ok(asset) => {
            result.download_url = Some(asset.browser_download_url);
            result.download_name = Some(asset.name);
        }
        Err(error) => {
            result.error = Some(error);
            return result;
        }
    }

    result.update_available = match is_version_newer(&latest_version, current_version) {
        Some(true) => true,
        Some(false) => false,
        None => compare_fallback(&latest_version, current_version)
            .map(|ordering| ordering == Ordering::Greater)
            .unwrap_or(false),
    };

    result
}

pub fn download_and_install_app_update(download_url: &str, file_name: &str) -> Result<String, String> {
    if download_url.trim().is_empty() {
        return Err("Download URL is missing.".to_string());
    }

    if file_name.trim().is_empty() {
        return Err("Installer file name is missing.".to_string());
    }

    let safe_name = Path::new(file_name)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Installer file name is invalid.".to_string())?;

    let download_dir = downloads_directory()?;
    fs::create_dir_all(&download_dir).map_err(|error| error.to_string())?;

    let installer_path = download_dir.join(safe_name);
    download_file(download_url, &installer_path)?;

    install_downloaded_artifact(&installer_path)
}

fn fetch_latest_release() -> Result<GithubRelease, String> {
    let response = ureq::get(GITHUB_RELEASES_LATEST)
        .set("Accept", "application/vnd.github+json")
        .set("User-Agent", USER_AGENT)
        .call()
        .map_err(|error| format!("Could not reach GitHub releases: {error}"))?;

    if response.status() != 200 {
        return Err(format!(
            "GitHub releases request failed with status {}.",
            response.status()
        ));
    }

    let body = response
        .into_string()
        .map_err(|error| format!("Could not read GitHub releases response: {error}"))?;

    serde_json::from_str::<GithubRelease>(&body)
        .map_err(|error| format!("GitHub releases response was invalid: {error}"))
}

fn normalize_release_tag(tag_name: &str) -> String {
    tag_name.trim().trim_start_matches('v').trim().to_string()
}

fn compare_fallback(latest: &str, current: &str) -> Option<Ordering> {
    let latest = parse_efvibe_version(latest)?;
    let current = parse_efvibe_version(current)?;
    Some(latest.cmp(&current))
}

fn downloads_directory() -> Result<PathBuf, String> {
    if let Some(downloads) = dirs::download_dir() {
        return Ok(downloads);
    }

    std::env::temp_dir()
        .canonicalize()
        .map_err(|error| error.to_string())
}

fn download_file(url: &str, destination: &Path) -> Result<(), String> {
    let response = ureq::get(url)
        .set("Accept", "application/octet-stream")
        .set("User-Agent", USER_AGENT)
        .call()
        .map_err(|error| format!("Download failed: {error}"))?;

    if !(200..300).contains(&response.status()) {
        return Err(format!(
            "Download failed with status {}.",
            response.status()
        ));
    }

    let mut reader = response.into_reader();
    let mut file = fs::File::create(destination).map_err(|error| error.to_string())?;
    std::io::copy(&mut reader, &mut file).map_err(|error| error.to_string())?;
    file.flush().map_err(|error| error.to_string())?;

    Ok(())
}

fn install_downloaded_artifact(path: &Path) -> Result<String, String> {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if file_name.ends_with(".msi") {
        return install_windows_msi(path);
    }

    if file_name.ends_with(".exe") {
        return install_windows_exe(path);
    }

    if file_name.ends_with(".dmg") {
        return install_macos_dmg(path);
    }

    if file_name.ends_with(".deb") {
        return install_linux_deb(path);
    }

    if file_name.ends_with(".rpm") {
        return install_linux_rpm(path);
    }

    if file_name.ends_with(".appimage") {
        return install_linux_appimage(path);
    }

    Err(format!(
        "Unsupported installer type for {}. Open the file manually from your downloads folder.",
        path.display()
    ))
}

#[cfg(target_os = "windows")]
fn install_windows_msi(path: &Path) -> Result<String, String> {
    Command::new("msiexec")
        .args([
            "/i",
            &path.to_string_lossy(),
            "/passive",
            "/norestart",
        ])
        .spawn()
        .map_err(|error| format!("Could not start the MSI installer: {error}"))?;

    Ok("Installer started. Quit Studio when the installer finishes, then reopen the app.".to_string())
}

#[cfg(not(target_os = "windows"))]
fn install_windows_msi(_path: &Path) -> Result<String, String> {
    Err("MSI installers are only supported on Windows.".to_string())
}

#[cfg(target_os = "windows")]
fn install_windows_exe(path: &Path) -> Result<String, String> {
    Command::new(path)
        .arg("/S")
        .spawn()
        .or_else(|_| {
            Command::new("cmd")
                .args(["/C", "start", "", &path.to_string_lossy()])
                .spawn()
                .map(|_| ())
        })
        .map_err(|error| format!("Could not start the installer: {error}"))?;

    Ok("Installer started. Quit Studio when the installer finishes, then reopen the app.".to_string())
}

#[cfg(not(target_os = "windows"))]
fn install_windows_exe(_path: &Path) -> Result<String, String> {
    Err("Windows installers are only supported on Windows.".to_string())
}

#[cfg(target_os = "macos")]
fn install_macos_dmg(path: &Path) -> Result<String, String> {
    Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|error| format!("Could not open the disk image: {error}"))?;

    Ok("Opened the update disk image. Drag MyEFvibe Studio to Applications, then reopen the app.".to_string())
}

#[cfg(not(target_os = "macos"))]
fn install_macos_dmg(_path: &Path) -> Result<String, String> {
    Err("macOS disk images are only supported on macOS.".to_string())
}

#[cfg(target_os = "linux")]
fn install_linux_deb(path: &Path) -> Result<String, String> {
    if try_privileged_linux_command(&["dpkg", "-i", &path.to_string_lossy()]) {
        return Ok(
            "Package install started. Quit Studio when the installer finishes, then reopen the app."
                .to_string(),
        );
    }

    open_path_in_file_manager(path)?;
    Ok(format!(
        "Saved the update to {}. Install it with your package manager, then reopen Studio.",
        path.display()
    ))
}

#[cfg(not(target_os = "linux"))]
fn install_linux_deb(_path: &Path) -> Result<String, String> {
    Err("Debian packages are only supported on Linux.".to_string())
}

#[cfg(target_os = "linux")]
fn install_linux_rpm(path: &Path) -> Result<String, String> {
    if try_privileged_linux_command(&["rpm", "-U", &path.to_string_lossy()])
        || try_privileged_linux_command(&[
            "dnf",
            "install",
            "-y",
            &path.to_string_lossy(),
        ])
    {
        return Ok(
            "Package install started. Quit Studio when the installer finishes, then reopen the app."
                .to_string(),
        );
    }

    open_path_in_file_manager(path)?;
    Ok(format!(
        "Saved the update to {}. Install it with your package manager, then reopen Studio.",
        path.display()
    ))
}

#[cfg(not(target_os = "linux"))]
fn install_linux_rpm(_path: &Path) -> Result<String, String> {
    Err("RPM packages are only supported on Linux.".to_string())
}

#[cfg(target_os = "linux")]
fn install_linux_appimage(path: &Path) -> Result<String, String> {
    use std::os::unix::fs::PermissionsExt;

    let mut permissions = fs::metadata(path)
        .map_err(|error| error.to_string())?
        .permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions).map_err(|error| error.to_string())?;

    if let Ok(current_exe) = std::env::current_exe() {
        if current_exe
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.to_ascii_lowercase().ends_with(".appimage"))
        {
            let target = current_exe.with_file_name(path.file_name().ok_or_else(|| {
                "Downloaded AppImage file name is invalid.".to_string()
            })?);

            if target != path {
                fs::copy(path, &target).map_err(|error| error.to_string())?;
                let mut target_permissions = fs::metadata(&target)
                    .map_err(|error| error.to_string())?
                    .permissions();
                target_permissions.set_mode(0o755);
                fs::set_permissions(&target, target_permissions)
                    .map_err(|error| error.to_string())?;
            }

            return Ok(format!(
                "Updated AppImage saved to {}. Quit Studio and launch this file to use the new version.",
                target.display()
            ));
        }
    }

    Ok(format!(
        "Saved the update to {}. Quit Studio and launch this AppImage to use the new version.",
        path.display()
    ))
}

#[cfg(not(target_os = "linux"))]
fn install_linux_appimage(_path: &Path) -> Result<String, String> {
    Err("AppImage updates are only supported on Linux.".to_string())
}

#[cfg(target_os = "linux")]
fn try_privileged_linux_command(command: &[&str]) -> bool {
    if command.is_empty() {
        return false;
    }

    if Command::new("pkexec").args(command).spawn().is_ok() {
        return true;
    }

    if let Ok(display) = std::env::var("DISPLAY") {
        if !display.trim().is_empty()
            && Command::new("kdesudo")
                .args(command)
                .env("DISPLAY", display)
                .spawn()
                .is_ok()
        {
            return true;
        }
    }

    false
}

#[cfg(target_os = "linux")]
fn open_path_in_file_manager(path: &Path) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(path.parent().unwrap_or(path))
        .spawn()
        .map_err(|error| format!("Could not open the downloads folder: {error}"))?;
    Ok(())
}

fn select_release_asset(assets: &[GithubReleaseAsset]) -> Result<GithubReleaseAsset, String> {
    let preferences = preferred_asset_patterns();
    let mut ranked: Vec<(usize, &GithubReleaseAsset)> = assets
        .iter()
        .filter_map(|asset| {
            let rank = preferences
                .iter()
                .position(|pattern| asset.name.to_ascii_lowercase().contains(pattern))?;
            Some((rank, asset))
        })
        .collect();

    ranked.sort_by_key(|(rank, _)| *rank);

    ranked
        .first()
        .map(|(_, asset)| GithubReleaseAsset {
            name: asset.name.clone(),
            browser_download_url: asset.browser_download_url.clone(),
        })
        .ok_or_else(|| {
            format!(
                "No installer found for this platform. See {}",
                "https://github.com/yeahbah/my-ef-vibe-studio/releases/latest"
            )
        })
}

fn preferred_asset_patterns() -> Vec<&'static str> {
    #[cfg(target_os = "windows")]
    {
        return vec![".msi", "x64-setup.exe", ".exe"];
    }

    #[cfg(target_os = "macos")]
    {
        if std::env::consts::ARCH == "aarch64" {
            return vec!["aarch64.dmg", ".dmg"];
        }

        return Vec::new();
    }

    #[cfg(target_os = "linux")]
    {
        return linux_asset_patterns();
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Vec::new()
    }
}

#[cfg(target_os = "linux")]
fn linux_asset_patterns() -> Vec<&'static str> {
    match linux_package_family() {
        LinuxPackageFamily::Rpm => vec![".rpm", ".appimage", ".deb"],
        LinuxPackageFamily::Deb => vec![".deb", ".appimage", ".rpm"],
        LinuxPackageFamily::Unknown => vec![".appimage", ".deb", ".rpm"],
    }
}

#[cfg(target_os = "linux")]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LinuxPackageFamily {
    Rpm,
    Deb,
    Unknown,
}

#[cfg(target_os = "linux")]
fn linux_package_family() -> LinuxPackageFamily {
    let contents = fs::read_to_string("/etc/os-release").unwrap_or_default().to_ascii_lowercase();

    if contents.contains("id=fedora")
        || contents.contains("id=nobara")
        || contents.contains("id=rhel")
        || contents.contains("id=centos")
        || contents.contains("id=rocky")
        || contents.contains("id=almalinux")
        || contents.contains("id_like=fedora")
        || contents.contains("id_like=rhel")
    {
        return LinuxPackageFamily::Rpm;
    }

    if contents.contains("id=debian")
        || contents.contains("id=ubuntu")
        || contents.contains("id=linuxmint")
        || contents.contains("id=pop")
        || contents.contains("id_like=debian")
        || contents.contains("id_like=ubuntu")
    {
        return LinuxPackageFamily::Deb;
    }

    LinuxPackageFamily::Unknown
}

#[cfg(target_os = "macos")]
pub fn platform_update_error() -> Option<String> {
    if std::env::consts::ARCH != "aarch64" {
        return Some(
            "Intel Macs are not supported. Download updates manually from GitHub Releases."
                .to_string(),
        );
    }

    None
}

#[cfg(not(target_os = "macos"))]
pub fn platform_update_error() -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_release_tag_strips_v_prefix() {
        assert_eq!(normalize_release_tag("v0.2.3"), "0.2.3");
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn select_release_asset_prefers_msi_on_windows() {
        let assets = vec![
            GithubReleaseAsset {
                name: "MyEFvibe.Studio_0.2.3_x64-setup.exe".to_string(),
                browser_download_url: "https://example.com/setup.exe".to_string(),
            },
            GithubReleaseAsset {
                name: "MyEFvibe.Studio_0.2.3_x64_en-US.msi".to_string(),
                browser_download_url: "https://example.com/setup.msi".to_string(),
            },
        ];

        let selected = select_release_asset(&assets).expect("asset");
        assert!(selected.name.ends_with(".msi"));
    }

    #[test]
    #[cfg(target_os = "linux")]
    fn select_release_asset_prefers_rpm_when_rpm_is_first_preference() {
        let assets = vec![
            GithubReleaseAsset {
                name: "MyEFvibe.Studio_0.2.3_amd64.deb".to_string(),
                browser_download_url: "https://example.com/pkg.deb".to_string(),
            },
            GithubReleaseAsset {
                name: "MyEFvibe.Studio-0.2.3-1.x86_64.rpm".to_string(),
                browser_download_url: "https://example.com/pkg.rpm".to_string(),
            },
        ];

        let patterns = linux_asset_patterns();
        let selected = assets
            .iter()
            .filter_map(|asset| {
                let rank = patterns
                    .iter()
                    .position(|pattern| asset.name.to_ascii_lowercase().contains(pattern))?;
                Some((rank, asset))
            })
            .min_by_key(|(rank, _)| *rank)
            .map(|(_, asset)| asset.name.clone())
            .expect("asset");

        assert!(selected.ends_with(".rpm"));
    }

    #[test]
    fn check_app_update_marks_newer_release_as_available() {
        let release = GithubRelease {
            tag_name: "v9.9.9".to_string(),
            html_url: "https://example.com/release".to_string(),
            body: Some("Release notes".to_string()),
            assets: vec![GithubReleaseAsset {
                name: "MyEFvibe.Studio_9.9.9_x64_en-US.msi".to_string(),
                browser_download_url: "https://example.com/setup.msi".to_string(),
            }],
        };

        let latest_version = normalize_release_tag(&release.tag_name);
        let current_version = "0.2.3";
        let update_available = is_version_newer(&latest_version, current_version) == Some(true);

        assert!(update_available);
    }
}
