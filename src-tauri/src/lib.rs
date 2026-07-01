mod app_update;
mod commands;
mod daemon;
mod efvibe_version;
mod git;
mod path_env;
mod sample_workspace;
mod tool;

#[cfg(target_os = "linux")]
mod linux_graphics;
#[cfg(target_os = "linux")]
mod linux_window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    path_env::augment_process_path();

    #[cfg(target_os = "linux")]
    linux_graphics::apply_workarounds();

    use tauri::Manager;

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_pty::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            if let Some(icon) = app.default_window_icon().cloned() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon);
                }
            }

            #[cfg(target_os = "linux")]
            if let Err(error) = linux_window::use_system_window_decorations(app) {
                eprintln!("MyEFvibe Studio: could not enable system window decorations: {error}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_prerequisites,
            commands::about_json,
            commands::invalidate_efvibe_daemon,
            commands::rebuild_efvibe_daemon,
            commands::cancel_efvibe_daemon_request,
            commands::daemon_eval,
            commands::daemon_request,
            commands::open_in_ide,
            commands::start_repl,
            commands::git_status,
            commands::git_commit_files,
            commands::clone_adventureworks_sqlite,
            commands::set_window_title,
            commands::file_manager_label,
            commands::repl_spawn_spec,
            commands::check_app_update,
            commands::download_and_install_app_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
