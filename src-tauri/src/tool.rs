use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionSettings {
    pub workspace_root: String,
    pub project: String,
    pub startup_project: String,
    pub context: String,
    pub connection_string: String,
    pub tool_path: String,
    pub db_log: bool,
    pub dotnet_framework: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ToolInvocation {
    Path {
        command: String,
        prefix_args: Vec<String>,
    },
    DotnetTool {
        command: String,
        prefix_args: Vec<String>,
        framework: Option<String>,
    },
    Global {
        command: String,
        prefix_args: Vec<String>,
    },
}

impl ToolInvocation {
    pub fn command(&self) -> &str {
        match self {
            Self::Path { command, .. }
            | Self::DotnetTool { command, .. }
            | Self::Global { command, .. } => command,
        }
    }

    pub fn prefix_args(&self) -> &[String] {
        match self {
            Self::Path { prefix_args, .. }
            | Self::DotnetTool { prefix_args, .. }
            | Self::Global { prefix_args, .. } => prefix_args,
        }
    }
}

pub fn find_dotnet_tools_manifest(start_directory: &Path) -> Option<PathBuf> {
    let mut current = start_directory.to_path_buf();

    for _ in 0..12 {
        let candidate = current.join("dotnet-tools.json");
        if candidate.is_file() {
            return Some(candidate);
        }

        if !current.pop() {
            break;
        }
    }

    None
}

pub fn resolve_tool_invocation(
    search_directory: &Path,
    tool_path: &str,
    dotnet_framework: &str,
) -> ToolInvocation {
    if !tool_path.trim().is_empty() {
        return ToolInvocation::Path {
            command: tool_path.trim().to_string(),
            prefix_args: vec![],
        };
    }

    if let Some(manifest_path) = find_dotnet_tools_manifest(search_directory) {
        if let Ok(contents) = fs::read_to_string(manifest_path) {
            if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&contents) {
                if manifest
                    .get("tools")
                    .and_then(|tools| tools.get("efvibe"))
                    .is_some()
                {
                    let framework = dotnet_framework.trim();
                    let prefix_args = if framework.is_empty() {
                        vec!["efvibe".to_string()]
                    } else {
                        vec![
                            "efvibe".to_string(),
                            "-f".to_string(),
                            framework.to_string(),
                        ]
                    };

                    return ToolInvocation::DotnetTool {
                        command: "dotnet".to_string(),
                        prefix_args,
                        framework: if framework.is_empty() {
                            None
                        } else {
                            Some(framework.to_string())
                        },
                    };
                }
            }
        }
    }

    ToolInvocation::Global {
        command: "efvibe".to_string(),
        prefix_args: vec![],
    }
}

fn resolve_cli_path(value: &str, base_directory: Option<&Path>) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let path = Path::new(trimmed);
    if path.is_absolute() {
        return path.to_string_lossy().to_string();
    }

    if let Some(base) = base_directory {
        return base.join(trimmed).to_string_lossy().to_string();
    }

    trimmed.to_string()
}

fn resolve_existing_cli_path(value: &str, base_directory: Option<&Path>) -> String {
    let direct = resolve_cli_path(value, None);
    if !direct.is_empty() && Path::new(&direct).exists() {
        return direct;
    }

    let relative = resolve_cli_path(value, base_directory);
    if !relative.is_empty() && Path::new(&relative).exists() {
        return relative;
    }

    String::new()
}

pub fn build_efvibe_args(
    settings: &ConnectionSettings,
    base_directory: Option<&Path>,
    force_build: bool,
) -> Vec<String> {
    let mut args = Vec::new();

    let workspace_root = resolve_cli_path(&settings.workspace_root, base_directory);
    if !workspace_root.is_empty() {
        args.push("-w".to_string());
        args.push(workspace_root);
    }

    let project = resolve_cli_path(&settings.project, base_directory);
    if !project.is_empty() {
        args.push("-p".to_string());
        args.push(project);
    }

    let startup_project = resolve_existing_cli_path(&settings.startup_project, base_directory);
    if !startup_project.is_empty() {
        args.push("-s".to_string());
        args.push(startup_project);
    }

    if !settings.context.trim().is_empty() {
        args.push("-c".to_string());
        args.push(settings.context.trim().to_string());
    }

    if !settings.connection_string.trim().is_empty() {
        args.push("--connection-string".to_string());
        args.push(settings.connection_string.trim().to_string());
    }

    if !settings.db_log {
        args.push("--no-dblog".to_string());
    }

    if !settings.dotnet_framework.trim().is_empty() {
        args.push("--framework".to_string());
        args.push(settings.dotnet_framework.trim().to_string());
    }

    if force_build {
        args.push("--force-build".to_string());
    }

    args
}

pub fn build_serve_args(
    settings: &ConnectionSettings,
    base_directory: Option<&Path>,
    force_build: bool,
) -> Vec<String> {
    let mut args = vec!["serve".to_string()];
    args.extend(build_efvibe_args(settings, base_directory, force_build));
    args
}

pub fn settings_key(
    settings: &ConnectionSettings,
    search_directory: &Path,
    cwd: &Path,
) -> String {
    serde_json::json!({
        "cwd": cwd.to_string_lossy(),
        "searchDirectory": search_directory.to_string_lossy(),
        "workspaceRoot": settings.workspace_root,
        "project": settings.project,
        "startupProject": settings.startup_project,
        "context": settings.context,
        "connectionString": settings.connection_string,
        "toolPath": settings.tool_path,
        "dbLog": settings.db_log,
        "dotnetFramework": settings.dotnet_framework,
    })
    .to_string()
}
