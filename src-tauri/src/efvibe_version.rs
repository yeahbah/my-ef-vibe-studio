use crate::tool::ToolInvocation;
use std::process::Command;

/// Minimum efvibe version required by this Studio build (daemon API + script session flags).
pub const MINIMUM_EFVIBE_VERSION: &str = "0.6.26";

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct SemVer {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

pub fn parse_efvibe_version(raw: &str) -> Option<SemVer> {
    for token in raw.split(|character: char| {
        !character.is_ascii_digit() && character != '.'
    }) {
        if let Some(version) = parse_semver(token) {
            return Some(version);
        }
    }

    None
}

fn parse_semver(text: &str) -> Option<SemVer> {
    let base = text.split('+').next()?.split('-').next()?;
    let mut parts = base.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;

    if parts.next().is_some() {
        return None;
    }

    Some(SemVer {
        major,
        minor,
        patch,
    })
}

pub fn meets_minimum_version(found: &str, minimum: &str) -> bool {
    let Some(found) = parse_efvibe_version(found) else {
        return false;
    };

    let Some(minimum) = parse_semver(minimum) else {
        return false;
    };

    found >= minimum
}

pub fn format_version_too_old_error(found: &str) -> String {
    let parsed = parse_efvibe_version(found)
        .map(|version| format!("{}.{}.{}", version.major, version.minor, version.patch))
        .unwrap_or_else(|| found.trim().to_string());

    format!(
        "efvibe {parsed} is too old for MyEFvibe Studio (requires {MINIMUM_EFVIBE_VERSION}+).\n\
         Update the global tool: dotnet tool update -g efvibe\n\
         Or point Settings → efvibe path to a current myefvibe build."
    )
}

pub fn run_efvibe_version(invocation: &ToolInvocation) -> Result<String, String> {
    let mut args = invocation.prefix_args().to_vec();
    args.push("--version".to_string());

    let output = Command::new(invocation.command())
        .args(&args)
        .output()
        .map_err(|error| error.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("Command failed: {}", invocation.command())
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub fn ensure_efvibe_minimum_version(invocation: &ToolInvocation) -> Result<(), String> {
    let version = run_efvibe_version(invocation)?;

    if meets_minimum_version(&version, MINIMUM_EFVIBE_VERSION) {
        return Ok(());
    }

    Err(format_version_too_old_error(&version))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_efvibe_version_reads_semver_from_cli_output() {
        let version = parse_efvibe_version("myefvibe 0.6.34+1a5d6db224cd5c6db27c2ea139e204b539cca198")
            .expect("version");

        assert_eq!(
            version,
            SemVer {
                major: 0,
                minor: 6,
                patch: 34
            }
        );
    }

    #[test]
    fn meets_minimum_version_compares_patch_levels() {
        assert!(meets_minimum_version("0.6.26", MINIMUM_EFVIBE_VERSION));
        assert!(meets_minimum_version("myefvibe 0.6.34+abc", MINIMUM_EFVIBE_VERSION));
        assert!(!meets_minimum_version("0.6.25", MINIMUM_EFVIBE_VERSION));
        assert!(!meets_minimum_version("0.5.99", MINIMUM_EFVIBE_VERSION));
    }
}
