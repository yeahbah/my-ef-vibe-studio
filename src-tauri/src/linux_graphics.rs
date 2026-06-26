//! Linux WebKitGTK / GPU workarounds for packaged builds (AppImage, deb, rpm).
//!
//! See https://v2.tauri.app/develop/debug/linux-graphics/

pub fn apply_workarounds() {
    // Respect explicit user overrides (e.g. WEBKIT_DISABLE_DMABUF_RENDERER=0).
    set_default_env("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    set_default_env("__NV_DISABLE_EXPLICIT_SYNC", "1");
}

fn set_default_env(key: &str, value: &str) {
    if std::env::var_os(key).is_none() {
        // SAFETY: called on the main thread before WebKit or worker threads start.
        unsafe {
            std::env::set_var(key, value);
        }
    }
}
