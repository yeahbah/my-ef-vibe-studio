use serde::Serialize;
use std::path::Path;
use std::process::Command;

const STUDIO_FILE_SUFFIXES: &[&str] = &[
    ".efvibe-workspace",
    ".efvibe-query",
    ".efvibe-notebook",
    ".efvibe-pack",
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatusResult {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub dirty_files: Vec<String>,
    pub untracked_files: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitResult {
    pub committed: bool,
    pub output: String,
}

fn run_git(directory: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(directory)
        .output()
        .map_err(|error| format!("Failed to run git: {error}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        Ok(if stdout.is_empty() { stderr } else { stdout })
    } else {
        Err(if stderr.is_empty() {
            format!("git {} failed", args.join(" "))
        } else {
            stderr
        })
    }
}

fn is_studio_file(path: &str) -> bool {
    STUDIO_FILE_SUFFIXES
        .iter()
        .any(|suffix| path.ends_with(suffix))
}

pub fn git_status(directory: String) -> GitStatusResult {
    let path = Path::new(&directory);
    if !path.exists() {
        return GitStatusResult {
            is_repo: false,
            branch: None,
            dirty_files: Vec::new(),
            untracked_files: Vec::new(),
            error: Some("Directory does not exist.".to_string()),
        };
    }

    if run_git(path, &["rev-parse", "--is-inside-work-tree"]).is_err() {
        return GitStatusResult {
            is_repo: false,
            branch: None,
            dirty_files: Vec::new(),
            untracked_files: Vec::new(),
            error: None,
        };
    }

    let branch = run_git(path, &["branch", "--show-current"]).ok();
    let porcelain = run_git(path, &["status", "--porcelain"]).unwrap_or_default();

    let mut dirty_files = Vec::new();
    let mut untracked_files = Vec::new();

    for line in porcelain.lines() {
        if line.len() < 4 {
            continue;
        }

        let status = &line[..2];
        let file = line[3..].trim();
        let file = file.rsplit(" -> ").next().unwrap_or(file).trim();

        if !is_studio_file(file) {
            continue;
        }

        if status.contains('?') {
            untracked_files.push(file.to_string());
        } else {
            dirty_files.push(file.to_string());
        }
    }

    GitStatusResult {
        is_repo: true,
        branch,
        dirty_files,
        untracked_files,
        error: None,
    }
}

pub fn git_commit_files(
    directory: String,
    message: String,
    files: Vec<String>,
) -> Result<GitCommitResult, String> {
    let path = Path::new(&directory);
    let trimmed_message = message.trim();
    if trimmed_message.is_empty() {
        return Err("Commit message is required.".to_string());
    }

    if files.is_empty() {
        return Err("Select at least one file to commit.".to_string());
    }

    let mut args = vec!["add"];
    args.extend(files.iter().map(String::as_str));
    run_git(path, &args)?;

    let output = run_git(path, &["commit", "-m", trimmed_message])?;

    let committed = !output.contains("nothing to commit");
    Ok(GitCommitResult {
        committed,
        output,
    })
}

#[cfg(test)]
mod tests {
    use super::is_studio_file;

    #[test]
    fn studio_file_suffixes_are_recognized() {
        assert!(is_studio_file("queries/demo.efvibe-query"));
        assert!(is_studio_file("team-pack.efvibe-pack"));
        assert!(!is_studio_file("src/App.tsx"));
    }
}
