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

#[cfg(test)]
mod tests {
    use super::augment_process_path;

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
}
