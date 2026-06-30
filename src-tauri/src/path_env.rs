use std::path::Path;

/// GUI apps on macOS (and some Linux DEs) inherit a minimal PATH. Prepend common
/// locations for `dotnet`, Homebrew, and global .NET tools.
pub fn augment_process_path() {
    let mut extra: Vec<String> = Vec::new();

    if cfg!(target_os = "macos") {
        extra.push("/opt/homebrew/bin".to_string());
        extra.push("/usr/local/bin".to_string());
        extra.push("/usr/local/share/dotnet".to_string());
    }

    if cfg!(target_os = "linux") {
        extra.push("/usr/local/bin".to_string());
    }

    if let Ok(home) = std::env::var("HOME") {
        if !home.is_empty() {
            extra.push(format!("{home}/.dotnet/tools"));
            extra.push(format!("{home}/.local/bin"));
        }
    }

    let current = std::env::var("PATH").unwrap_or_default();
    let separator = if cfg!(target_os = "windows") { ";" } else { ":" };

    let merged = extra
        .into_iter()
        .filter(|entry| !entry.is_empty())
        .chain(std::iter::once(current))
        .collect::<Vec<_>>()
        .join(separator);

    unsafe {
        std::env::set_var("PATH", merged);
    }
}

/// Resolve `dotnet` even when the SDK install did not add a `/usr/local/bin` symlink.
pub fn resolve_dotnet_executable() -> String {
    for candidate in dotnet_candidate_paths() {
        if executable_exists(&candidate) {
            return candidate;
        }
    }

    "dotnet".to_string()
}

/// Resolve the global `efvibe` tool when `~/.dotnet/tools` is not on PATH.
pub fn resolve_global_efvibe_executable() -> String {
    for candidate in global_efvibe_candidate_paths() {
        if executable_exists(&candidate) {
            return candidate;
        }
    }

    "efvibe".to_string()
}

fn dotnet_candidate_paths() -> Vec<String> {
    let mut candidates = vec!["dotnet".to_string()];

    if cfg!(target_os = "macos") {
        candidates.push("/usr/local/share/dotnet/dotnet".to_string());
        candidates.push("/opt/homebrew/bin/dotnet".to_string());
    }

    if let Ok(home) = std::env::var("HOME") {
        if !home.is_empty() {
            candidates.push(format!("{home}/.dotnet/dotnet"));
        }
    }

    candidates
}

fn global_efvibe_candidate_paths() -> Vec<String> {
    let mut candidates = vec!["efvibe".to_string()];

    if let Ok(home) = std::env::var("HOME") {
        if !home.is_empty() {
            candidates.push(format!("{home}/.dotnet/tools/efvibe"));
        }
    }

    candidates
}

fn executable_exists(path: &str) -> bool {
    let path = Path::new(path);
    path.is_file() && path.metadata().map(|meta| !meta.permissions().readonly()).unwrap_or(true)
}

#[cfg(test)]
mod tests {
    use super::{
        augment_process_path, global_efvibe_candidate_paths, resolve_dotnet_executable,
        resolve_global_efvibe_executable,
    };
    use std::path::Path;

    #[test]
    fn augment_process_path_prepends_dotnet_tools() {
        std::env::set_var("PATH", "/usr/bin");
        if let Ok(home) = std::env::var("HOME") {
            augment_process_path();
            let path = std::env::var("PATH").expect("PATH");
            assert!(path.contains("/usr/bin"));
            assert!(path.contains(&format!("{home}/.dotnet/tools")));
        }
    }

    #[test]
    fn resolve_dotnet_executable_uses_macos_install_path_when_present() {
        let resolved = resolve_dotnet_executable();
        if Path::new("/usr/local/share/dotnet/dotnet").is_file() {
            assert_eq!(resolved, "/usr/local/share/dotnet/dotnet");
        }
    }

    #[test]
    fn resolve_global_efvibe_executable_uses_dotnet_tools_when_present() {
        if let Ok(home) = std::env::var("HOME") {
            let expected = format!("{home}/.dotnet/tools/efvibe");
            if Path::new(&expected).is_file() {
                assert_eq!(resolve_global_efvibe_executable(), expected);
            }
        }
    }

    #[test]
    fn global_efvibe_candidate_paths_includes_home_tool_path() {
        if let Ok(home) = std::env::var("HOME") {
            let paths = global_efvibe_candidate_paths();
            assert!(paths.contains(&format!("{home}/.dotnet/tools/efvibe")));
        }
    }
}
