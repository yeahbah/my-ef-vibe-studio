mod commands;
mod daemon;
mod git;
mod tool;

#[cfg(target_os = "linux")]
mod linux_window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(target_os = "linux")]
            if let Err(error) = linux_window::use_system_window_decorations(app) {
                eprintln!("efvibe Studio: could not enable system window decorations: {error}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_prerequisites,
            commands::invalidate_efvibe_daemon,
            commands::daemon_eval,
            commands::daemon_request,
            commands::open_in_ide,
            commands::start_repl,
            commands::git_status,
            commands::git_commit_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
