use crate::daemon::{invalidate_daemon, run_daemon_json, run_expression};
use crate::tool::{resolve_tool_invocation, ConnectionSettings, ToolInvocation};
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
