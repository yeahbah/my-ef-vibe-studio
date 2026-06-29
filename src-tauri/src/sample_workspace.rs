use std::path::{Path, PathBuf};
use std::process::Command;

const REPO_SSH: &str = "git@github.com:yeahbah/AdventureWorks-sqlite.git";
const REPO_HTTPS: &str = "https://github.com/yeahbah/AdventureWorks-sqlite.git";
const REPO_FOLDER: &str = "AdventureWorks-sqlite";

fn run_git(args: &[&str], working_directory: Option<&Path>) -> Result<(), String> {
    let mut command = Command::new("git");
    command.args(args);

    if let Some(directory) = working_directory {
        command.current_dir(directory);
    }

    let output = command
        .output()
        .map_err(|error| format!("Failed to run git: {error}"))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let details = if stderr.is_empty() { stdout } else { stderr };

    Err(if details.is_empty() {
        format!("git {} failed", args.join(" "))
    } else {
        details
    })
}

fn clone_repository(parent_directory: &Path, remote_url: &str) -> Result<PathBuf, String> {
    std::fs::create_dir_all(parent_directory)
        .map_err(|error| format!("Failed to create sample directory: {error}"))?;

    let target = parent_directory.join(REPO_FOLDER);

    if target.join(".git").is_dir() {
        return Ok(target);
    }

    if target.exists() {
        return Err(format!(
            "{} already exists but is not a git repository.",
            target.display()
        ));
    }

    run_git(
        &["clone", "--depth", "1", remote_url, REPO_FOLDER],
        Some(parent_directory),
    )?;

    Ok(target)
}

pub fn clone_adventureworks_sqlite(parent_directory: String) -> Result<String, String> {
    let parent = PathBuf::from(parent_directory.trim());

    if parent.as_os_str().is_empty() {
        return Err("Sample parent directory is required.".to_string());
    }

    match clone_repository(&parent, REPO_SSH) {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(ssh_error) => clone_repository(&parent, REPO_HTTPS)
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|https_error| {
                format!(
                    "Could not clone AdventureWorks sample repository.\nSSH: {ssh_error}\nHTTPS: {https_error}"
                )
            }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repo_constants_are_stable() {
        assert!(REPO_SSH.contains("AdventureWorks-sqlite"));
        assert!(REPO_HTTPS.contains("AdventureWorks-sqlite"));
        assert_eq!(REPO_FOLDER, "AdventureWorks-sqlite");
    }
}
