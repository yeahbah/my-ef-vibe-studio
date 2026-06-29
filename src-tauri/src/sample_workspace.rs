use include_dir::{include_dir, Dir, DirEntry};
use std::path::{Path, PathBuf};
use std::process::Command;

const REPO_SSH: &str = "git@github.com:yeahbah/AdventureWorks-sqlite.git";
const REPO_HTTPS: &str = "https://github.com/yeahbah/AdventureWorks-sqlite.git";
const REPO_FOLDER: &str = "AdventureWorks-sqlite";
const STUDIO_FOLDER: &str = "studio";

static SAMPLE_STUDIO: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/resources/sample-studio");
static SAMPLE_DATABASE: &[u8] = include_bytes!("../resources/adventureworks-sample.db");
const SAMPLE_DATABASE_MIN_BYTES: u64 = 64 * 1024;
const SAMPLE_DATABASE_RELATIVE: &str = "database/sqlite/AdventureWorks.db";

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

fn write_embedded_dir(dir: &Dir, target: &Path) -> Result<(), String> {
    for entry in dir.entries() {
        match entry {
            DirEntry::Dir(subdir) => write_embedded_dir(subdir, target)?,
            DirEntry::File(file) => {
                let path = target.join(file.path());
                if let Some(parent) = path.parent() {
                    std::fs::create_dir_all(parent).map_err(|error| {
                        format!("Failed to create {}: {error}", parent.display())
                    })?;
                }

                std::fs::write(&path, file.contents()).map_err(|error| {
                    format!("Failed to write {}: {error}", path.display())
                })?;
            }
        }
    }

    Ok(())
}

fn materialize_sample_studio(repo_root: &Path) -> Result<PathBuf, String> {
    let studio_root = repo_root.join(STUDIO_FOLDER);
    std::fs::create_dir_all(&studio_root).map_err(|error| {
        format!(
            "Failed to create sample studio directory {}: {error}",
            studio_root.display()
        )
    })?;

    write_embedded_dir(&SAMPLE_STUDIO, &studio_root)?;
    Ok(studio_root)
}

fn materialize_sample_database(repo_root: &Path) -> Result<PathBuf, String> {
    let db_path = repo_root.join(SAMPLE_DATABASE_RELATIVE);
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Failed to create sample database directory {}: {error}",
                parent.display()
            )
        })?;
    }

    let needs_copy = match std::fs::metadata(&db_path) {
        Ok(metadata) => metadata.len() < SAMPLE_DATABASE_MIN_BYTES,
        Err(_) => true,
    };

    if needs_copy {
        std::fs::write(&db_path, SAMPLE_DATABASE).map_err(|error| {
            format!(
                "Failed to write sample database {}: {error}",
                db_path.display()
            )
        })?;
    }

    Ok(db_path)
}

pub fn clone_adventureworks_sqlite(parent_directory: String) -> Result<String, String> {
    let parent = PathBuf::from(parent_directory.trim());

    if parent.as_os_str().is_empty() {
        return Err("Sample parent directory is required.".to_string());
    }

    let repo_root = match clone_repository(&parent, REPO_SSH) {
        Ok(path) => path,
        Err(ssh_error) => clone_repository(&parent, REPO_HTTPS).map_err(|https_error| {
            format!(
                "Could not clone AdventureWorks sample repository.\nSSH: {ssh_error}\nHTTPS: {https_error}"
            )
        })?,
    };

    materialize_sample_studio(&repo_root)?;
    materialize_sample_database(&repo_root)?;

    Ok(repo_root.to_string_lossy().to_string())
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

    #[test]
    fn embedded_sample_studio_includes_scripts_and_queries() {
        assert!(SAMPLE_STUDIO.get_file("scripts/constants.csx").is_some());
        assert!(SAMPLE_STUDIO.get_file("scripts/product-filters.csx").is_some());
        assert!(SAMPLE_STUDIO
            .get_file("queries/01-linq-method-syntax.efvibe-query")
            .is_some());
        assert!(SAMPLE_STUDIO
            .get_file("adventureworks.efvibe-workspace")
            .is_some());
    }

    #[test]
    fn materialize_sample_studio_writes_expected_layout() {
        let temp = std::env::temp_dir().join(format!(
            "efvibe-sample-studio-test-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&temp);

        let studio_root = materialize_sample_studio(&temp).expect("materialize sample studio");

        assert!(studio_root.join("scripts/constants.csx").is_file());
        assert!(studio_root.join("queries/07-csharp-program.efvibe-query").is_file());
        assert!(studio_root.join("notebooks/getting-started.efvibe-notebook").is_file());
        assert!(studio_root.join("adventureworks.efvibe-workspace").is_file());

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn materialize_sample_database_writes_non_empty_file() {
        let temp = std::env::temp_dir().join(format!(
            "efvibe-sample-db-test-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&temp);

        let db_path = materialize_sample_database(&temp).expect("materialize sample database");

        assert_eq!(
            db_path,
            temp.join("database/sqlite/AdventureWorks.db")
        );
        assert!(db_path.metadata().expect("db metadata").len() >= SAMPLE_DATABASE_MIN_BYTES);

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn materialize_sample_database_replaces_placeholder_file() {
        let temp = std::env::temp_dir().join(format!(
            "efvibe-sample-db-replace-test-{}",
            std::process::id()
        ));
        let db_path = temp.join(SAMPLE_DATABASE_RELATIVE);
        let _ = std::fs::remove_dir_all(&temp);
        std::fs::create_dir_all(db_path.parent().expect("db parent"))
            .expect("create db parent");
        std::fs::write(&db_path, b"").expect("write placeholder db");

        materialize_sample_database(&temp).expect("replace placeholder db");

        assert!(db_path.metadata().expect("db metadata").len() >= SAMPLE_DATABASE_MIN_BYTES);

        let _ = std::fs::remove_dir_all(&temp);
    }
}
