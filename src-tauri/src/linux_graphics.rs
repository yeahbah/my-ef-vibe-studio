//! Linux WebKitGTK / GPU workarounds for packaged builds (AppImage, deb, rpm).
//!
//! See https://v2.tauri.app/develop/debug/linux-graphics/

use std::path::Path;

pub fn apply_workarounds() {
    ensure_appimage_webkit_paths();

    // Respect explicit user overrides (e.g. WEBKIT_DISABLE_DMABUF_RENDERER=0).
    set_default_env("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    set_default_env("__NV_DISABLE_EXPLICIT_SYNC", "1");

    if std::env::var_os("APPIMAGE").is_some() {
        set_default_env("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
}

/// Tauri patches libwebkit to spawn helpers at `././/lib/.../webkit2gtk-4.1/`.
/// AppDir stores libraries under `usr/lib`, so create `lib -> usr/lib` at runtime.
fn ensure_appimage_webkit_paths() {
    let Some(appdir) = resolve_appdir() else {
        return;
    };

    let usr_lib = appdir.join("usr/lib");
    let lib_link = appdir.join("lib");

    if !usr_lib.is_dir() || lib_link.exists() {
        return;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;

        if symlink("usr/lib", &lib_link).is_err() {
            eprintln!("efvibe Studio: could not create AppImage lib symlink at {}", lib_link.display());
        }
    }
}

fn resolve_appdir() -> Option<std::path::PathBuf> {
    if let Ok(appdir) = std::env::var("APPDIR") {
        let path = Path::new(&appdir);
        if path.is_dir() {
            return Some(path.to_path_buf());
        }
    }

    if std::env::var_os("APPIMAGE").is_none() {
        return None;
    }

    let exe = std::env::current_exe().ok()?;
    let mut dir = exe.parent()?.to_path_buf();

    // AppImage mount layout: .../usr/bin/<binary>
    if dir.ends_with("bin") {
        if let Some(parent) = dir.parent() {
            if parent.ends_with("usr") {
                if let Some(root) = parent.parent() {
                    dir = root.to_path_buf();
                }
            }
        }
    }

    if dir.join("usr/lib").is_dir() {
        Some(dir)
    } else {
        None
    }
}

fn set_default_env(key: &str, value: &str) {
    if std::env::var_os(key).is_none() {
        // SAFETY: called on the main thread before WebKit or worker threads start.
        unsafe {
            std::env::set_var(key, value);
        }
    }
}
