use crate::daemon::{invalidate_daemon, run_daemon_json, run_expression};
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
pub fn check_prerequisites(
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

    match run_version("dotnet", &["--version".to_string()]) {
        Ok(version) => {
            result.dotnet.found = true;
            result.dotnet.version = Some(version);
        }
        Err(error) => result.dotnet.error = Some(error),
    }

    let mut efvibe_args = result.efvibe.invocation.prefix_args().to_vec();
    efvibe_args.push("--version".to_string());

    match run_version(result.efvibe.invocation.command(), &efvibe_args) {
        Ok(version) => {
            result.efvibe.found = true;
            result.efvibe.version = Some(version);
        }
        Err(error) => result.efvibe.error = Some(error),
    }

    result.ok = result.dotnet.found && result.efvibe.found;
    result
}

#[tauri::command]
pub fn invalidate_efvibe_daemon() {
    invalidate_daemon();
}

#[tauri::command]
pub fn daemon_eval(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
    expression: String,
    with_plan: bool,
) -> Result<String, String> {
    run_expression(settings, search_directory, cwd, expression, with_plan)
}

#[tauri::command]
pub fn daemon_request(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
    request: serde_json::Value,
    timeout_ms: Option<u64>,
) -> Result<String, String> {
    run_daemon_json(settings, search_directory, cwd, request, timeout_ms)
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
    parts.extend(build_efvibe_args(settings, Some(search_directory)));
    parts.into_iter().map(|part| quote_shell_arg(&part)).collect::<Vec<_>>().join(" ")
}

#[tauri::command]
pub fn start_repl(
    settings: ConnectionSettings,
    search_directory: String,
    cwd: String,
) -> Result<(), String> {
    let search_path = Path::new(&search_directory);
    let cwd_path = Path::new(&cwd);
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
