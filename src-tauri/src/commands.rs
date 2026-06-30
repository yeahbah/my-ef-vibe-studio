use crate::daemon::{cancel_inflight_request, invalidate_daemon, rebuild_daemon, run_daemon_json, run_expression};
use crate::efvibe_version::{self, MINIMUM_EFVIBE_VERSION};
use crate::path_env::resolve_dotnet_executable;
use crate::tool::{
    build_efvibe_args, resolve_tool_invocation, ConnectionSettings, ToolInvocation,
};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrerequisiteCheckResult {
    pub ok: bool,
    pub minimum_efvibe_version: String,
    pub dotnet: PrerequisiteEntry,
    pub efvibe: PrerequisiteEfvibeEntry,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrerequisiteEntry {
    pub found: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrerequisiteEfvibeEntry {
    pub found: bool,
    pub version: Option<String>,
    pub error: Option<String>,
    pub invocation: ToolInvocation,
}

fn run_version(command: &str, args: &[String]) -> Result<String, String> {
    let output = Command::new(command)
        .args(args)
        .output()
        .map_err(|error| error.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("Command failed: {command}")
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
pub async fn check_prerequisites(
    search_directory: String,
    tool_path: String,
    dotnet_framework: String,
) -> Result<PrerequisiteCheckResult, String> {
    Ok(tauri::async_runtime::spawn_blocking(move || {
        check_prerequisites_sync(search_directory, tool_path, dotnet_framework)
    })
    .await
    .map_err(|error| error.to_string())?)
}

fn check_prerequisites_sync(
    search_directory: String,
    tool_path: String,
    dotnet_framework: String,
) -> PrerequisiteCheckResult {
    let invocation = resolve_tool_invocation(
        Path::new(&search_directory),
        &tool_path,
        &dotnet_framework,
    );

    let mut result = PrerequisiteCheckResult {
        ok: false,
        minimum_efvibe_version: MINIMUM_EFVIBE_VERSION.to_string(),
        dotnet: PrerequisiteEntry {
            found: false,
            version: None,
            error: None,
        },
        efvibe: PrerequisiteEfvibeEntry {
            found: false,
            version: None,
            error: None,
            invocation,
        },
    };

    match run_version(&resolve_dotnet_executable(), &["--version".to_string()]) {
        Ok(version) => {
            result.dotnet.found = true;
            result.dotnet.version = Some(version);
        }
        Err(error) => result.dotnet.error = Some(error),
    }

    match efvibe_version::run_efvibe_version(&result.efvibe.invocation) {
        Ok(version) => {
            result.efvibe.found = true;
            result.efvibe.version = Some(version.clone());

            if let Err(error) =
                efvibe_version::check_minimum_version(&version, MINIMUM_EFVIBE_VERSION)
            {
                result.efvibe.error = Some(error);
            }
        }
        Err(error) => result.efvibe.error = Some(error),
    }

    result.ok = result.dotnet.found
        && result.efvibe.found
        && result.efvibe.error.is_none();
    result
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AboutJsonPayload {
    pub tool_version: String,
    pub command: String,
    pub product_name: String,
    pub description: String,
    pub author: String,
    pub license: String,
    pub website: String,
    pub repository: String,
    pub nu_get: String,
    pub runtime: String,
}

#[tauri::command]
pub async fn about_json(
    search_directory: String,
    tool_path: String,
    dotnet_framework: String,
) -> Result<AboutJsonPayload, String> {
    tauri::async_runtime::spawn_blocking(move || {
        about_json_sync(search_directory, tool_path, dotnet_framework)
    })
    .await
    .map_err(|error| error.to_string())?
}

fn about_json_sync(
    search_directory: String,
    tool_path: String,
    dotnet_framework: String,
) -> Result<AboutJsonPayload, String> {
    let invocation = resolve_tool_invocation(
        Path::new(&search_directory),
        &tool_path,
        &dotnet_framework,
    );

    let mut args = invocation.prefix_args().to_vec();
    args.push("--about-json".to_string());
    args.push("--no-banner".to_string());

    let output = Command::new(invocation.command())
        .args(&args)
        .output()
        .map_err(|error| error.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "efvibe --about-json failed.".to_string()
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout
        .lines()
        .find(|line| !line.trim().is_empty())
        .ok_or_else(|| "efvibe --about-json returned no output.".to_string())?;

    serde_json::from_str(line.trim()).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn invalidate_efvibe_daemon() {
    invalidate_daemon();
}

#[tauri::command]
pub async fn rebuild_efvibe_daemon(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        rebuild_daemon(settings, search_directory, cwd)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn cancel_efvibe_daemon_request() {
    cancel_inflight_request();
}

#[tauri::command]
pub async fn daemon_eval(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
    expression: String,
    with_plan: bool,
    skip: Option<i32>,
    page_size: Option<i32>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_expression(settings, search_directory, cwd, expression, with_plan, skip, page_size)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn daemon_request(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
    request: serde_json::Value,
    timeout_ms: Option<u64>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_daemon_json(settings, search_directory, cwd, request, timeout_ms)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn git_status(directory: String) -> crate::git::GitStatusResult {
    crate::git::git_status(directory)
}

#[tauri::command]
pub fn git_commit_files(
    directory: String,
    message: String,
    files: Vec<String>,
) -> Result<crate::git::GitCommitResult, String> {
    crate::git::git_commit_files(directory, message, files)
}

#[tauri::command]
pub fn clone_adventureworks_sqlite(parent_directory: String) -> Result<String, String> {
    crate::sample_workspace::clone_adventureworks_sqlite(parent_directory)
}

#[tauri::command]
pub fn open_in_ide(
    file: String,
    line: u32,
    editor: String,
    custom_command: String,
) -> Result<(), String> {
    let target = if line > 0 {
        format!("{file}:{line}")
    } else {
        file
    };

    let status = match editor.as_str() {
        "code" => Command::new("code").args(["-g", &target]).status(),
        "rider" => Command::new("rider").arg(&target).status(),
        "devenv" => Command::new("devenv").args(["/edit", &target]).status(),
        "custom" => {
            if custom_command.trim().is_empty() {
                return Err("Custom IDE command is not configured.".to_string());
            }

            Command::new("sh")
                .arg("-lc")
                .arg(format!("{custom_command} {target}"))
                .status()
        }
        other => return Err(format!("Unsupported editor: {other}")),
    }
    .map_err(|error| error.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Failed to open {target} in {editor}."))
    }
}

fn quote_shell_arg(value: &str) -> String {
    if value.is_empty() {
        return "''".to_string();
    }

    if !value.chars().any(|ch| ch.is_whitespace() || matches!(ch, '"' | '\'' | '\\' | '$')) {
        return value.to_string();
    }

    format!("'{}'", value.replace('\'', "'\\''"))
}

fn build_repl_command_line(
    settings: &ConnectionSettings,
    search_directory: &Path,
) -> String {
    let invocation = resolve_tool_invocation(
        search_directory,
        &settings.tool_path,
        &settings.dotnet_framework,
    );
    let mut parts = vec![invocation.command().to_string()];
    parts.extend(invocation.prefix_args().iter().cloned());
    parts.extend(build_efvibe_args(settings, Some(search_directory), false));
    parts.into_iter().map(|part| quote_shell_arg(&part)).collect::<Vec<_>>().join(" ")
}

fn build_repl_spawn_spec(
    settings: &ConnectionSettings,
    search_directory: &Path,
    cwd: &Path,
) -> ReplSpawnSpec {
    let invocation = resolve_tool_invocation(
        search_directory,
        &settings.tool_path,
        &settings.dotnet_framework,
    );
    let mut args = invocation.prefix_args().to_vec();
    args.extend(build_efvibe_args(settings, Some(search_directory), false));

    ReplSpawnSpec {
        program: invocation.command().to_string(),
        args,
        cwd: cwd.to_string_lossy().to_string(),
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplSpawnSpec {
    pub program: String,
    pub args: Vec<String>,
    pub cwd: String,
}

#[tauri::command]
pub fn repl_spawn_spec(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
) -> Result<ReplSpawnSpec, String> {
    let search_path = Path::new(&search_directory);
    let cwd_path = Path::new(&cwd);
    let invocation = resolve_tool_invocation(
        search_path,
        &settings.tool_path,
        &settings.dotnet_framework,
    );
    efvibe_version::ensure_efvibe_minimum_version(&invocation)?;
    Ok(build_repl_spawn_spec(&settings, search_path, cwd_path))
}

#[tauri::command]
pub fn start_repl(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
) -> Result<(), String> {
    let search_path = Path::new(&search_directory);
    let cwd_path = Path::new(&cwd);
    let invocation = resolve_tool_invocation(
        search_path,
        &settings.tool_path,
        &settings.dotnet_framework,
    );
    efvibe_version::ensure_efvibe_minimum_version(&invocation)?;
    let command_line = build_repl_command_line(&settings, search_path);
    let shell_script = format!(
        "cd {} && {}; exec $SHELL",
        quote_shell_arg(cwd_path.to_string_lossy().as_ref()),
        command_line
    );

    #[cfg(target_os = "linux")]
    {
        let terminals = [
            ("x-terminal-emulator", vec!["-e", "bash", "-lc", &shell_script]),
            ("gnome-terminal", vec!["--", "bash", "-lc", &shell_script]),
            ("konsole", vec!["-e", "bash", "-lc", &shell_script]),
            ("kitty", vec!["bash", "-lc", &shell_script]),
            ("alacritty", vec!["-e", "bash", "-lc", &shell_script]),
        ];

        for (terminal, args) in terminals {
            if Command::new("sh")
                .arg("-lc")
                .arg(format!("command -v {terminal}"))
                .output()
                .map(|output| output.status.success())
                .unwrap_or(false)
            {
                return Command::new(terminal)
                    .args(args)
                    .spawn()
                    .map(|_| ())
                    .map_err(|error| format!("Failed to start {terminal}: {error}"));
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "tell application \"Terminal\" to do script \"{}\"",
            shell_script.replace('\\', "\\\\").replace('"', "\\\"")
        );
        return Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("Failed to start Terminal: {error}"));
    }

    #[cfg(target_os = "windows")]
    {
        return Command::new("cmd")
            .args(["/C", "start", "cmd", "/k", &format!("cd /d {cwd} && {command_line}")])
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("Failed to start cmd: {error}"));
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        let _ = shell_script;
        return Err("REPL terminal launch is not supported on this platform.".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        Err("No terminal emulator found. Install x-terminal-emulator, gnome-terminal, or konsole.".to_string())
    }
}

#[tauri::command]
pub fn set_window_title(app: tauri::AppHandle, title: String) -> Result<(), String> {
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "'main' window not found".to_string())?;

    window.set_title(&title).map_err(|error| error.to_string())?;

    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::*;
        if let Ok(gtk_window) = window.gtk_window() {
            gtk_window.set_title(&title);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn file_manager_label() -> String {
    #[cfg(target_os = "windows")]
    {
        return "Explorer".to_string();
    }

    #[cfg(target_os = "macos")]
    {
        return "Finder".to_string();
    }

    #[cfg(target_os = "linux")]
    {
        return "file manager".to_string();
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        "file manager".to_string()
    }
}
