use crate::tool::ToolInvocation;
use serde::Deserialize;
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
    parse_all_semvers(raw).into_iter().max()
}

fn parse_all_semvers(raw: &str) -> Vec<SemVer> {
    raw.split(|character: char| !character.is_ascii_digit() && character != '.')
        .filter_map(parse_semver)
        .collect()
}

fn parse_semver(text: &str) -> Option<SemVer> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }

    let base = trimmed.split('+').next()?.split('-').next()?;
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

pub fn compare_semver_strings(left: &str, right: &str) -> Option<std::cmp::Ordering> {
    let left = parse_efvibe_version(left)?;
    let right = parse_efvibe_version(right)?;
    Some(left.cmp(&right))
}

pub fn is_version_newer(candidate: &str, current: &str) -> Option<bool> {
    compare_semver_strings(candidate, current).map(|ordering| ordering == std::cmp::Ordering::Greater)
}

pub fn check_minimum_version(found: &str, minimum: &str) -> Result<(), String> {
    let Some(found) = parse_efvibe_version(found) else {
        return Err(format!(
            "Could not determine efvibe version from tool output.\n\
             Point Settings → efvibe path to a current myefvibe build, or run:\n\
             dotnet tool update -g efvibe"
        ));
    };

    let Some(minimum) = parse_semver(minimum) else {
        return Ok(());
    };

    if found >= minimum {
        return Ok(());
    }

    Err(format_version_too_old_error(&format!(
        "{}.{}.{}",
        found.major, found.minor, found.patch
    )))
}

pub fn format_version_too_old_error(found: &str) -> String {
    format!(
        "efvibe {found} is too old for MyEFvibe Studio (requires {MINIMUM_EFVIBE_VERSION}+).\n\
         Update the global tool: dotnet tool update -g efvibe\n\
         Or point Settings → efvibe path to a current myefvibe build."
    )
}

#[derive(Debug, Deserialize)]
struct AboutJson {
    #[serde(rename = "toolVersion")]
    tool_version: String,
}

pub fn run_efvibe_version(invocation: &ToolInvocation) -> Result<String, String> {
    let mut args = invocation.prefix_args().to_vec();
    args.push("--about-json".to_string());
    args.push("--no-banner".to_string());

    let output = run_command_output(invocation, &args)?;

    let line = output
        .lines()
        .find(|line| !line.trim().is_empty())
        .ok_or_else(|| "efvibe --about-json returned no output.".to_string())?;

    let about: AboutJson = serde_json::from_str(line.trim()).map_err(|error| {
        format!("efvibe --about-json returned invalid JSON: {error}")
    })?;

    if about.tool_version.trim().is_empty() {
        return Err("efvibe --about-json returned an empty toolVersion.".to_string());
    }

    Ok(about.tool_version)
}

pub fn ensure_efvibe_minimum_version(invocation: &ToolInvocation) -> Result<(), String> {
    let version = run_efvibe_version(invocation)?;
    check_minimum_version(&version, MINIMUM_EFVIBE_VERSION)
}

fn run_command_output(invocation: &ToolInvocation, args: &[String]) -> Result<String, String> {
    let output = Command::new(invocation.command())
        .args(args)
        .output()
        .map_err(|error| error.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = if stdout.trim().is_empty() {
        stderr.trim().to_string()
    } else {
        stdout.trim().to_string()
    };

    if !output.status.success() {
        return Err(if combined.is_empty() {
            format!("Command failed: {}", invocation.command())
        } else {
            combined
        });
    }

    Ok(combined)
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
    fn parse_efvibe_version_uses_highest_semver_in_multiline_output() {
        let version = parse_efvibe_version(
            "You are running efvibe 0.6.20\nmyefvibe 0.6.35+4cf82f0\n",
        )
        .expect("version");

        assert_eq!(
            version,
            SemVer {
                major: 0,
                minor: 6,
                patch: 35
            }
        );
    }

    #[test]
    fn check_minimum_version_compares_patch_levels() {
        assert!(check_minimum_version("0.6.26", MINIMUM_EFVIBE_VERSION).is_ok());
        assert!(check_minimum_version("0.6.35", MINIMUM_EFVIBE_VERSION).is_ok());
        assert!(check_minimum_version("myefvibe 0.6.34+abc", MINIMUM_EFVIBE_VERSION).is_ok());
        assert!(check_minimum_version("0.6.25", MINIMUM_EFVIBE_VERSION).is_err());
        assert!(check_minimum_version("0.5.99", MINIMUM_EFVIBE_VERSION).is_err());
    }

    #[test]
    fn check_minimum_version_distinguishes_unparseable_output() {
        let error = check_minimum_version("not a version", MINIMUM_EFVIBE_VERSION)
            .expect_err("expected parse failure");

        assert!(error.contains("Could not determine efvibe version"));
        assert!(!error.contains("too old"));
    }

    #[test]
    fn compare_semver_strings_orders_versions() {
        assert_eq!(
            compare_semver_strings("0.2.4", "0.2.3"),
            Some(std::cmp::Ordering::Greater)
        );
        assert_eq!(
            compare_semver_strings("0.2.3", "0.2.3"),
            Some(std::cmp::Ordering::Equal)
        );
    }
}
